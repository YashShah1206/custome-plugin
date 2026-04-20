<?php
/**
 * Plugin Name: Custom Product Designer
 * Plugin URI: https://example.com/custom-product-designer
 * Description: A premium product customization tool — browse products, design in 3D, and order directly. Use shortcode [product_designer] to embed.
 * Version: 2.4.0
 * Author: Custom Developer
 * License: GPL v2 or later
 * Text Domain: custom-product-designer
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CPD_VERSION', '2.4.0');
define('CPD_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CPD_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once CPD_PLUGIN_DIR . 'includes/class-cpd-database.php';
require_once CPD_PLUGIN_DIR . 'includes/class-cpd-rest-api.php';
require_once CPD_PLUGIN_DIR . 'includes/class-cpd-woocommerce.php';
require_once CPD_PLUGIN_DIR . 'includes/class-cpd-woo-hooks.php';

/**
 * Activation: create DB tables and designs folder
 */
function cpd_activate() {
    CPD_Database::create_tables();
    $upload_dir = wp_upload_dir();
    $designs_dir = $upload_dir['basedir'] . '/cpd-designs';
    if (!file_exists($designs_dir)) {
        wp_mkdir_p($designs_dir);
        file_put_contents($designs_dir . '/.htaccess', 'Options -Indexes');
    }
}
register_activation_hook(__FILE__, 'cpd_activate');

// Initialize Store Integration
$cpd_wc = new CPD_WooCommerce();

/**
 * Register shortcode
 */
function cpd_register_shortcode() {
    add_shortcode('product_designer', 'cpd_render_shortcode');
}
add_action('init', 'cpd_register_shortcode');

/**
 * Render the shortcode
 */
function cpd_render_shortcode($atts) {
    cpd_enqueue_assets();

    $wc_product_id = 0;
    $wc_product_name = '';
    $wc_product_price = 25.00;
    $wc_cart_url   = '';
    $wc_add_to_cart_url = '';

    if (function_exists('wc_get_cart_url')) {
        $wc_cart_url = wc_get_cart_url();
        $atts = shortcode_atts(array('product_id' => 0), $atts, 'product_designer');
        $wc_product_id = intval($atts['product_id']);
        
        // Priority: URL Param > Shortcode Param
        if (isset($_GET['product_id'])) {
            $wc_product_id = intval($_GET['product_id']);
        }
        
        if ($wc_product_id > 0) {
            $product = wc_get_product($wc_product_id);
            if ($product) {
                // Support both simple and variable products
                $wc_product_name = $product->get_title();
                
                // Get display price (handles variable product 'from' price or current price)
                $wc_product_price = floatval($product->get_price());
                
                // Fallback to regular price if sale price is not set or zero
                if ($wc_product_price <= 0) {
                    $wc_product_price = floatval($product->get_regular_price());
                }
                
                // Final fallback if price is still empty (e.g. variable product with no default)
                if ($wc_product_price <= 0 && $product->is_type('variable')) {
                    $wc_product_price = floatval($product->get_variation_regular_price('min'));
                }

                if ($wc_product_price <= 0) {
                    $wc_product_price = 25.00;
                }
            }
        }
        
        $wc_add_to_cart_url = esc_url_raw(rest_url('wc/store/v1/cart/add-item'));
    }

    $is_product_page = function_exists('is_product') && is_product();
    $start_requested = isset($_GET['start_customizing']) && $_GET['start_customizing'] == '1';

    wp_localize_script('cpd-react-app', 'cpdData', array(
        'restUrl'         => esc_url_raw(rest_url('cpd/v1/')),
        'nonce'           => wp_create_nonce('wp_rest'),
        'pluginUrl'       => CPD_PLUGIN_URL,
        'userId'          => get_current_user_id(),
        'productId'       => $wc_product_id,
        'productName'     => $wc_product_name,
        'productPrice'    => $wc_product_price,
        'cartUrl'         => trailingslashit($wc_cart_url),
        'homeUrl'         => trailingslashit(home_url('/')),
        'wcAddToCartUrl'  => $wc_add_to_cart_url,
        'isProductPage'   => $is_product_page,
        'startRequested'  => $start_requested,
    ));

    return '<div id="cpd-root" style="width:100%; font-family:Inter,sans-serif;"></div>';
}

/**
 * Enqueue React build assets
 */
function cpd_enqueue_assets() {
    $build_dir = CPD_PLUGIN_DIR . 'build/assets/';
    $build_url = CPD_PLUGIN_URL . 'build/assets/';

    if (!is_dir($build_dir)) {
        return;
    }

    $files = scandir($build_dir);
    foreach ($files as $file) {
        if (preg_match('/\.js$/', $file)) {
            wp_enqueue_script(
                'cpd-react-app',
                $build_url . $file,
                array(),
                CPD_VERSION,
                true
            );
        }
        if (preg_match('/\.css$/', $file)) {
            wp_enqueue_style(
                'cpd-react-styles',
                $build_url . $file,
                array(),
                CPD_VERSION
            );
        }
    }

    wp_enqueue_style(
        'cpd-google-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&family=Bebas+Neue&family=Anton&family=Oswald:wght@600&family=Pacifico&family=Dancing+Script:wght@700&family=Permanent+Marker&family=Bangers&family=Lobster&family=Righteous&display=swap',
        array(),
        null
    );
}

/**
 * REST API init
 */
function cpd_init_rest_api() {
    $api = new CPD_Rest_API();
    $api->register_routes();
}
add_action('rest_api_init', 'cpd_init_rest_api');

/**
 * Admin menu
 */
function cpd_admin_menu() {
    add_menu_page(
        'Custom Product Designer',
        'Custom Product Designer',
        'manage_options',
        'cpd-designs',
        'cpd_admin_page',
        'dashicons-art',
        30
    );
}
add_action('admin_menu', 'cpd_admin_menu');

/**
 * Admin dashboard page — shows all saved designs with multi-view images
 */
function cpd_admin_page() {
    $designs = CPD_Database::get_all_designs();
    ?>
    <div class="wrap cpd-admin-wrap">
        <h1 class="cpd-admin-title">🎨 Custom Product Designer</h1>
        <p>Use shortcode <code>[product_designer]</code> on any page or post to embed the designer.</p>
        <p>To enable WooCommerce cart: <code>[product_designer product_id="YOUR_PRODUCT_ID"]</code></p>

        <div class="cpd-admin-stats">
            <div class="cpd-admin-stat">
                <span class="cpd-stat-num"><?php echo count($designs); ?></span>
                <span class="cpd-stat-label">Saved Designs</span>
            </div>
        </div>

        <h2>Saved Designs</h2>
        <?php if (empty($designs)): ?>
            <p>No designs saved yet. Customers will see their saved designs here.</p>
        <?php else: ?>
            <div class="cpd-admin-grid">
                <?php foreach ($designs as $design): ?>
                    <div class="cpd-admin-card">
                        <?php
                        // Parse file_url — could be JSON (multi-view) or a single URL (legacy)
                        $urls = json_decode($design->file_url, true);
                        if (!$urls || !is_array($urls)) {
                            // Legacy single URL
                            $urls = $design->file_url ? array('front' => $design->file_url) : array();
                        }
                        ?>
                        <?php if (!empty($urls)): ?>
                            <div class="cpd-admin-card-images">
                                <?php foreach ($urls as $view => $url): ?>
                                    <div class="cpd-admin-card-view">
                                        <img src="<?php echo esc_url($url); ?>" alt="<?php echo esc_attr(ucfirst($view)); ?>" />
                                        <span class="cpd-admin-view-label"><?php echo esc_html(ucfirst($view)); ?></span>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        <?php else: ?>
                            <div class="cpd-admin-card-placeholder">No Image</div>
                        <?php endif; ?>
                        <div class="cpd-admin-card-info">
                            <strong><?php echo esc_html($design->product_name ?: 'Custom Design'); ?></strong>
                            <?php if (!empty($design->product_id)): ?>
                                <small style="font-size: 10px; color: #666;">WC ID: #<?php echo intval($design->product_id); ?></small>
                            <?php endif; ?>
                            <span class="cpd-admin-card-price"><?php echo get_woocommerce_currency_symbol(); ?><?php echo number_format($design->total_price, 2); ?></span>
                            <span style="background:<?php echo esc_attr($design->product_color); ?>;width:14px;height:14px;display:inline-block;border-radius:50%;border:1px solid #ccc;vertical-align:middle;"></span>
                            <?php echo esc_html($design->product_color); ?>
                            <?php 
                            if (!empty($design->sizes_quantities)) {
                                $sizes = json_decode($design->sizes_quantities, true);
                                if (is_array($sizes) && !empty($sizes)) {
                                    $size_strings = array();
                                    foreach ($sizes as $size => $qty) {
                                        $size_strings[] = esc_html($size) . ' (x' . intval($qty) . ')';
                                    }
                                    echo '<div style="margin: 8px 0; background: #f0f7ff; padding: 6px 10px; border: 1px solid #d0e2ff; border-radius: 4px; font-size: 11px;">';
                                    echo '<strong style="color: #0052cc;">📦 Quantities:</strong> ' . implode(', ', $size_strings);
                                    echo '</div>';
                                }
                            }

                            // Design details - Support both new Grouped format and Legacy flat format
                            if (!empty($design->text_content)) {
                                $views_data = json_decode($design->text_content, true);
                                if (is_array($views_data)) {
                                    $is_new_format = !isset($views_data[0]);

                                    if ($is_new_format) {
                                        $view_labels = array(
                                            'front' => '👕 Front Design',
                                            'back' => '👕 Back Design',
                                            'rightSleeve' => '💪 Right Design',
                                            'leftSleeve' => '💪 Left Design'
                                        );

                                        echo '<div class="cpd-admin-views-grid">';
                                        foreach ($views_data as $view_key => $details) {
                                            if (!is_array($details)) continue;
                                            if (empty($details['text']) && empty($details['art'])) continue;

                                            echo '<div class="cpd-admin-view-col">';
                                            echo '<h4 style="margin: 0 0 8px 0; font-size: 11px; color: #4361ee; background: #f0f3ff; padding: 4px 10px; border-radius: 4px; border-left: 3px solid #4361ee; text-transform: uppercase; letter-spacing: 0.5px;">' . ($view_labels[$view_key] ?? ucfirst($view_key)) . '</h4>';

                                            echo '<div class="cpd-admin-view-content">';
                                            // Text Items
                                            if (!empty($details['text']) && is_array($details['text'])) {
                                                foreach ($details['text'] as $item) {
                                                    // Force dark color for readability in admin, but use design font
                                                    $style = sprintf('color:#333; font-family:%s; font-weight:bold;', esc_attr($item['font'] ?? 'Inter'));
                                                    echo '<div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #eee;">';
                                                    echo '<span style="' . $style . ' font-size:13px;">' . esc_html($item['text'] ?? '') . '</span>';
                                                    echo '<div style="margin-top: 2px; font-size: 9px; color: #718096; line-height:1.2;">';
                                                    echo '<strong>' . esc_html(strtoupper($item['color'] ?? '#000')) . '</strong> | ' . esc_html($item['font'] ?? 'Inter');
                                                    if (!empty($item['dimensions'])) {
                                                        echo ' | ' . esc_html($item['dimensions']);
                                                    }
                                                    echo '</div></div>';
                                                }
                                            }

                                            // Art Items
                                            if (!empty($details['art']) && is_array($details['art'])) {
                                                foreach ($details['art'] as $art) {
                                                    echo '<div style="background: #f7fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 9px; margin-bottom: 4px;">';
                                                    echo '<strong>🎨 ' . esc_html($art['name'] ?? 'Artwork') . '</strong>';
                                                    if (!empty($art['dimensions'])) echo ' | ' . esc_html($art['dimensions']);
                                                    echo '</div>';
                                                }
                                            }
                                            echo '</div></div>';
                                        }
                                        echo '</div>'; // End cpd-admin-views-grid
                                    } else {
                                        // Legacy Flat Format
                                        echo '<div class="cpd-admin-meta-section" style="border: 1px solid #edf2f7; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #fff;">';
                                        echo '<h4 style="margin: 0 0 10px 0; font-size: 13px; color: #2d3748; border-bottom: 2px solid #edeff2; padding-bottom: 6px; text-transform: uppercase;">Design Details (Legacy)</h4>';
                                        foreach ($views_data as $item) {
                                            if (!is_array($item)) continue;
                                            $style = sprintf('color:#333; font-family:%s; font-weight:bold;', esc_attr($item['font'] ?? 'Inter'));
                                            echo '<div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #eee;">';
                                            echo '<span style="' . $style . ' font-size:16px;">' . esc_html($item['text'] ?? '') . '</span>';
                                            echo '</div>';
                                        }
                                        echo '</div>';
                                    }
                                }
                            }

                            // Display Customer Notes
                            if (!empty($design->customer_notes)) {
                                echo '<div class="cpd-admin-meta-section" style="background:#fffaf0; border:1px solid #fbd38d; padding:12px; border-radius:8px; margin-top:20px;">';
                                echo '<strong style="color:#744210; display: block; margin-bottom: 6px;">📝 Customer Instructions:</strong>';
                                echo '<div style="font-size:13px; font-style:italic; color: #4a5568;">' . nl2br(esc_html($design->customer_notes)) . '</div>';
                                echo '</div>';
                            }
                            // Display Global Fonts List (Safe check)
                            if (!empty($design->fonts_used)) {
                                $fonts = json_decode($design->fonts_used, true);
                                if (is_array($fonts) && !empty($fonts)) {
                                    echo '<div class="cpd-admin-meta-section">';
                                    echo '<strong>🔤 Global Fonts Used:</strong>';
                                    echo '<div class="cpd-admin-font-badges">';
                                    foreach ($fonts as $font_name) {
                                        echo '<span class="cpd-admin-badge cpd-admin-badge-font">' . esc_html($font_name) . '</span>';
                                    }
                                    echo '</div></div>';
                                }
                            }

                            // Display images used
                            if (!empty($design->images_used)) {
                                $imgs = json_decode($design->images_used, true);
                                if (is_array($imgs) && !empty($imgs)) {
                                    echo '<div class="cpd-admin-meta-section">';
                                    echo '<strong>🖼️ Uploaded Images:</strong><div class="cpd-admin-img-grid">';
                                    foreach ($imgs as $img_data) {
                                        $url = is_array($img_data) ? ($img_data['url'] ?? '') : $img_data;
                                        $dims = is_array($img_data) ? ($img_data['dimensions'] ?? '') : '';
                                        
                                        echo '<div style="text-align:center;">';
                                        echo '<a href="' . esc_url($url) . '" target="_blank">';
                                        echo '<img src="' . esc_url($url) . '" class="cpd-admin-img-thumb" />';
                                        echo '</a>';
                                        if ($dims) echo '<div style="font-size:8px; color:#666; margin-top:2px;">' . esc_html($dims) . '</div>';
                                        echo '</div>';
                                    }
                                    echo '</div></div>';
                                }
                            }
                            ?>
                            <small><?php echo esc_html($design->created_at); ?></small>
                            <?php if (!empty($urls)): ?>
                                <br>
                                <?php foreach ($urls as $view => $url): ?>
                                    <a href="<?php echo esc_url($url); ?>" target="_blank" download>⬇ <?php echo esc_html(ucfirst($view)); ?></a>&nbsp;
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

    <style>
    .cpd-admin-wrap { max-width: 1200px; }
    .cpd-admin-title { font-size: 28px; margin-bottom: 8px; }
    .cpd-admin-stats { display:flex; gap:16px; margin: 16px 0; }
    .cpd-admin-stat { background:#fff; border:1px solid #ddd; border-radius:8px; padding:16px 24px; text-align:center; }
    .cpd-stat-num { display:block; font-size:32px; font-weight:700; color:#4361ee; }
    .cpd-stat-label { font-size:13px; color:#666; }
    .cpd-admin-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; margin-top:16px; }
    .cpd-admin-card { background:#fff; border:1px solid #e0e0e0; border-radius:10px; overflow:hidden; }
    .cpd-admin-card-images { display:flex; gap:2px; background:#f5f5f5; border-bottom: 1px solid #eee; }
    .cpd-admin-card-view { flex:1; position:relative; }
    .cpd-admin-card-view img { width:100%; height:100px; object-fit:contain; background:#f5f5f5; }
    .cpd-admin-view-label { position:absolute; bottom:4px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.6); color:#fff; font-size:8px; padding:1px 4px; border-radius:2px; }
    .cpd-admin-card-placeholder { width:100%; height:100px; background:#f5f5f5; display:flex; align-items:center; justify-content:center; color:#999; }
    .cpd-admin-card-info { padding:8px; font-size:11px; line-height: 1.3; }
    .cpd-admin-card-info strong { display:block; margin-bottom:1px; }
    .cpd-admin-card-price { font-weight:700; color:#2d6b3f; font-size:13px; margin-right:6px; }
    .cpd-admin-meta-section { margin: 4px 0; background: #f8f9ff; padding: 4px; border-radius: 4px; border: 1px solid #e8ecff; }
    
    .cpd-admin-views-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 6px 0; }
    .cpd-admin-view-col { background: #fff; border: 1px solid #edf2f7; border-radius: 4px; padding: 4px; display: flex; flex-direction: column; }
    .cpd-admin-view-content { flex: 1; }
    
    .cpd-admin-meta-section strong { display: block; margin-bottom: 2px; font-size: 10px; color: #555; }
    .cpd-admin-font-badges { display: flex; flex-wrap: wrap; gap: 3px; }
    .cpd-admin-badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 500; }
    .cpd-admin-badge-font { background: #f0f3ff; color: #4361ee; border: 1px solid #c7d2fe; }
    .cpd-admin-img-grid { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
    .cpd-admin-img-thumb { width: 35px; height: 35px; object-fit: contain; border: 1px solid #ddd; border-radius: 3px; background: #fff; cursor: pointer; }
    .cpd-admin-img-thumb:hover { border-color: #4361ee; box-shadow: 0 0 0 1px rgba(67,97,238,0.2); }
    .cpd-admin-card small { font-size: 10px; color: #999; display: block; margin-top: 4px; }
    .cpd-admin-card a { font-size: 11px; text-decoration: none; color: #4361ee; }
    </style>
    <?php
}

