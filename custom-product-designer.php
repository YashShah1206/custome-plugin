<?php
/**
 * Plugin Name: Custom Product Designer
 * Plugin URI: https://example.com/custom-product-designer
 * Description: A premium product customization tool — browse products, design in 3D, and order directly. Use shortcode [product_designer] to embed.
 * Version: 2.1.0
 * Author: Custom Developer
 * License: GPL v2 or later
 * Text Domain: custom-product-designer
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CPD_VERSION', '2.1.0');
define('CPD_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CPD_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once CPD_PLUGIN_DIR . 'includes/class-cpd-database.php';
require_once CPD_PLUGIN_DIR . 'includes/class-cpd-rest-api.php';

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
    $wc_cart_url   = '';
    $wc_add_to_cart_url = '';

    if (function_exists('wc_get_cart_url')) {
        $wc_cart_url = wc_get_cart_url();
        $atts = shortcode_atts(array('product_id' => 0), $atts, 'product_designer');
        $wc_product_id = intval($atts['product_id']);
        $wc_add_to_cart_url = esc_url_raw(rest_url('wc/store/v1/cart/add-item'));
    }

    wp_localize_script('cpd-react-app', 'cpdData', array(
        'restUrl'         => esc_url_raw(rest_url('cpd/v1/')),
        'nonce'           => wp_create_nonce('wp_rest'),
        'pluginUrl'       => CPD_PLUGIN_URL,
        'userId'          => get_current_user_id(),
        'productId'       => $wc_product_id,
        'cartUrl'         => $wc_cart_url,
        'wcAddToCartUrl'  => $wc_add_to_cart_url,
    ));

    return '<div id="cpd-root" style="width:100%;min-height:700px;font-family:Inter,sans-serif;"></div>';
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
                            <span class="cpd-admin-card-price">$<?php echo number_format($design->total_price, 2); ?></span>
                            <span style="background:<?php echo esc_attr($design->product_color); ?>;width:14px;height:14px;display:inline-block;border-radius:50%;border:1px solid #ccc;vertical-align:middle;"></span>
                            <?php echo esc_html($design->product_color); ?>
                            <br>
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
    .cpd-admin-card-images { display:flex; gap:2px; background:#f5f5f5; }
    .cpd-admin-card-view { flex:1; position:relative; }
    .cpd-admin-card-view img { width:100%; height:120px; object-fit:contain; background:#f5f5f5; }
    .cpd-admin-view-label { position:absolute; bottom:4px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.6); color:#fff; font-size:10px; padding:2px 6px; border-radius:3px; }
    .cpd-admin-card-placeholder { width:100%; height:160px; background:#f5f5f5; display:flex; align-items:center; justify-content:center; color:#999; }
    .cpd-admin-card-info { padding:12px; font-size:13px; }
    .cpd-admin-card-info strong { display:block; margin-bottom:4px; }
    .cpd-admin-card-price { font-weight:700; color:#2d6b3f; font-size:15px; margin-right:8px; }
    </style>
    <?php
}
