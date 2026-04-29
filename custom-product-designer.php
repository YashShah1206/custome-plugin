<?php
/**
 * Plugin Name: Custom Product Designer
 * Plugin URI: https://example.com/custom-product-designer
 * Description: A premium product customization tool — browse products, design in 3D, and order directly. Use shortcode [product_designer] to embed.
 * Version: 2.4.1
 * Author: Custom Developer
 * License: GPL v2 or later
 * Text Domain: custom-product-designer
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CPD_VERSION', '2.4.2');
define('CPD_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CPD_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once CPD_PLUGIN_DIR . 'includes/class-cpd-rest-api.php';
require_once CPD_PLUGIN_DIR . 'includes/class-cpd-woocommerce.php';
require_once CPD_PLUGIN_DIR . 'includes/class-cpd-woo-hooks.php';
require_once CPD_PLUGIN_DIR . 'includes/class-cpd-admin.php';

/**
 * Activation: create designs folder
 */
function cpd_activate() {
    $upload_dir = wp_upload_dir();
    $designs_dir = $upload_dir['basedir'] . '/cpd-designs';
    $temp_dir = $upload_dir['basedir'] . '/cpd-temp';
    if (!file_exists($designs_dir)) {
        wp_mkdir_p($designs_dir);
        file_put_contents($designs_dir . '/.htaccess', 'Options -Indexes');
    }
    if (!file_exists($temp_dir)) {
        wp_mkdir_p($temp_dir);
        file_put_contents($temp_dir . '/.htaccess', 'Options -Indexes');
    }
}
register_activation_hook(__FILE__, 'cpd_activate');

/**
 * C5: Maximum number of templates allowed per product
 */
define('CPD_MAX_TEMPLATES_PER_PRODUCT', 15);

/**
 * M7: Schedule daily cleanup of old design images on activation
 */
function cpd_schedule_cleanup() {
    if (!wp_next_scheduled('cpd_daily_cleanup')) {
        wp_schedule_event(time(), 'daily', 'cpd_daily_cleanup');
    }
}
register_activation_hook(__FILE__, 'cpd_schedule_cleanup');

/**
 * Deactivation: clear scheduled cron
 */
function cpd_deactivate() {
    wp_clear_scheduled_hook('cpd_daily_cleanup');
    // Clear cached designer page ID
    delete_option('cpd_designer_page_id');
}
register_deactivation_hook(__FILE__, 'cpd_deactivate');

/**
 * M7: Cleanup design images older than X days (configurable)
 * Set 'cpd_cleanup_days' option in Settings. Default = 0 (disabled, never delete).
 * Example: set to 5 = delete images older than 5 days.
 */
function cpd_cleanup_old_designs() {
    $days = intval(get_option('cpd_cleanup_days', 0));
    
    // If 0 or negative, cleanup is disabled — keep images forever
    if ($days <= 0) return;
    
    $upload_dir = wp_upload_dir();
    $base_dirs = array(
        $upload_dir['basedir'] . '/cpd-designs',
        $upload_dir['basedir'] . '/cpd-temp',
    );

    $cutoff = time() - ($days * DAY_IN_SECONDS);

    foreach ($base_dirs as $base_dir) {
        if (!is_dir($base_dir)) {
            continue;
        }

        $date_folders = glob($base_dir . '/20*', GLOB_ONLYDIR);
        if (!$date_folders) {
            continue;
        }

        foreach ($date_folders as $folder) {
            $folder_date = basename($folder);
            $folder_time = strtotime($folder_date);

            if ($folder_time && $folder_time < $cutoff) {
                $files = glob($folder . '/*');
                if ($files) {
                    foreach ($files as $file) {
                        if (is_file($file)) {
                            wp_delete_file($file);
                        }
                    }
                }
                if (is_dir($folder) && count(glob($folder . '/*')) === 0) {
                    rmdir($folder);
                }
            }
        }
    }
}
add_action('cpd_daily_cleanup', 'cpd_cleanup_old_designs');

// Initialize Store Integration
$cpd_wc = new CPD_WooCommerce();
$cpd_admin = new CPD_Admin();

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

    $wc_product_category = 'short-sleeve'; // Default

    if (function_exists('wc_get_cart_url')) {
        $wc_cart_url = wc_get_cart_url();
        $atts = shortcode_atts(array('product_id' => 0), $atts, 'product_designer');
        $wc_product_id = intval($atts['product_id']);
        
        // Priority 1: URL Param
        if (isset($_GET['product_id'])) {
            $wc_product_id = intval($_GET['product_id']);
        }
        
        // Priority 2: Shortcode attribute (already set from $atts)

        // Priority 3: Current Queried Object (Standard WooCommerce Product Page)
        if ($wc_product_id === 0) {
            $queried_id = get_queried_object_id();
            if ($queried_id && get_post_type($queried_id) === 'product') {
                $wc_product_id = $queried_id;
            }
        }

        // Priority 4: Global Post (Fallback for some themes)
        if ($wc_product_id === 0) {
            global $post;
            if (isset($post->ID) && get_post_type($post->ID) === 'product') {
                $wc_product_id = $post->ID;
            }
        }
        
        if ($wc_product_id > 0) {
            $product = wc_get_product($wc_product_id);
            if ($product) {
                // Support both simple and variable products
                $wc_product_name = $product->get_title();
                
                // Get display price
                $wc_product_price = floatval($product->get_price());
                
                // Fallback to regular price if sale price is not set or zero
                if ($wc_product_price <= 0) {
                    $wc_product_price = floatval($product->get_regular_price());
                }
                
                // Category detection
                $terms = get_the_terms($wc_product_id, 'product_cat');
                if ($terms && !is_wp_error($terms)) {
                    foreach ($terms as $term) {
                        $slug = $term->slug;
                        // Map WooCommerce slugs to our internal category IDs
                        if (strpos($slug, 'cap') !== false) {
                            $wc_product_category = 'cap';
                            break;
                        } elseif (strpos($slug, 'hoodie') !== false) {
                            $wc_product_category = 'hoodie';
                            break;
                        } elseif (strpos($slug, 'jacket') !== false) {
                            $wc_product_category = 'jacket';
                            break;
                        }
                    }
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
        'isAdmin'         => current_user_can('manage_options'),
        'productId'       => $wc_product_id,
        'productName'     => $wc_product_name,
        'productPrice'    => $wc_product_price,
        'productCategory' => $wc_product_category,
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



