<?php
if (!defined('ABSPATH')) {
    exit;
}

class CPD_WooCommerce {

    public function __construct() {
        // 1. Add custom data to cart item (classic AJAX add-to-cart)
        add_filter('woocommerce_add_cart_item_data', array($this, 'add_cart_item_data'), 10, 3);
        
        // 2. Load custom data from session
        add_filter('woocommerce_get_cart_item_from_session', array($this, 'get_cart_item_from_session'), 10, 2);
        
        // 3. Display custom data in Cart and Checkout
        add_filter('woocommerce_get_item_data', array($this, 'get_item_data'), 10, 2);

        // 3.5 Sync Price and Totals (Crucial for Cart Totals and Checkout)
        add_action('woocommerce_before_calculate_totals', array($this, 'sync_cart_item_prices'), 10, 1);
        
        // 4. Save custom data to Order
        add_action('woocommerce_checkout_create_order_line_item', array($this, 'add_order_item_meta'), 10, 4);

        // 5. Display in Admin Order View
        add_action('woocommerce_before_order_itemmeta', array($this, 'admin_order_item_display'), 10, 3);

        // 6. Override cart item quantity with total from sizes
        add_filter('woocommerce_cart_item_quantity', array($this, 'cart_item_quantity_display'), 10, 3);

        // 7. Register Store API ExtendSchema for block-based cart/checkout
        add_action('woocommerce_blocks_loaded', array($this, 'register_store_api_extension'));

        // 8. Add custom cart item CSS on cart/checkout pages
        add_action('wp_head', array($this, 'add_cart_styles'));

        // 9. Process custom cart updates for the size matrix
        add_action('woocommerce_update_cart_action_cart_updated', array($this, 'process_custom_cart_updates'), 10, 1);

        // 10. Server-side trampoline: intercept cpd_add_to_cart and add item directly
        add_action('template_redirect', array($this, 'handle_cpd_add_to_cart'));

        // 11. Debug endpoint: visit ?cpd_debug_cart=1 to see cart contents
        add_action('template_redirect', array($this, 'debug_cart_contents'));

        // 12. Force classic cart & checkout instead of Block Cart (Astra/Block compatibility fix)
        add_filter('the_content', array($this, 'force_classic_cart_checkout'), 1);

        // 13. Override standard Cart Column displays (Price and Subtotal)
        add_filter('woocommerce_cart_item_price', array($this, 'cart_item_price_display'), 10, 3);
        add_filter('woocommerce_cart_item_subtotal', array($this, 'cart_item_subtotal_display'), 10, 3);

        // 14. Add Modal JavaScript in footer
        add_action('wp_footer', array($this, 'add_cart_scripts'));

        // 15. Rename Cart Headers for Unified Table
        add_filter('gettext', array($this, 'rename_cart_headers'), 20, 3);
    }

    /**
     * Replace WooCommerce Block Cart/Checkout with Classic Shortcode versions.
     * The Block Cart is incompatible with custom cart item data rendering.
     */
    public function force_classic_cart_checkout($content) {
        if (is_cart()) {
            return do_shortcode('[woocommerce_cart]');
        }
        if (is_checkout() && !is_wc_endpoint_url()) {
            return do_shortcode('[woocommerce_checkout]');
        }
        return $content;
    }


    /**
     * Debug endpoint: visit t-design.local/?cpd_debug_cart=1 to see current cart state
     * REMOVE THIS IN PRODUCTION
     */
    public function debug_cart_contents() {
        if (!isset($_GET['cpd_debug_cart'])) {
            return;
        }

        header('Content-Type: text/html; charset=utf-8');

        echo '<h1>CPD Cart Debug</h1>';
        echo '<h2>WooCommerce Status</h2>';
        echo '<p>WC loaded: ' . (function_exists('WC') ? 'YES' : 'NO') . '</p>';
        echo '<p>Cart object: ' . (WC()->cart ? 'YES' : 'NO') . '</p>';
        echo '<p>Session object: ' . (WC()->session ? 'YES' : 'NO') . '</p>';
        echo '<p>Cart URL: ' . wc_get_cart_url() . '</p>';
        echo '<p>Session ID: ' . (WC()->session ? WC()->session->get_customer_id() : 'N/A') . '</p>';

        echo '<h2>Cart Contents (' . WC()->cart->get_cart_contents_count() . ' items)</h2>';
        $cart = WC()->cart->get_cart();
        if (empty($cart)) {
            echo '<p style="color:red;font-weight:bold;">CART IS EMPTY</p>';
        } else {
            echo '<pre>';
            foreach ($cart as $key => $item) {
                echo "Item Key: $key\n";
                echo "  Product ID: " . $item['product_id'] . "\n";
                echo "  Quantity: " . $item['quantity'] . "\n";
                echo "  CPD Design ID: " . ($item['cpd_design_id'] ?? 'NOT SET') . "\n";
                echo "  CPD Design URLs: " . ($item['cpd_design_urls'] ?? 'NOT SET') . "\n";
                echo "---\n";
            }
            echo '</pre>';
        }

        // Test add if requested
        if (isset($_GET['test_product_id'])) {
            $test_pid = absint($_GET['test_product_id']);
            $product = wc_get_product($test_pid);
            echo '<h2>Test Add Product #' . $test_pid . '</h2>';
            if ($product) {
                echo '<p>Product found: ' . $product->get_name() . ' (Type: ' . $product->get_type() . ')</p>';
                echo '<p>Is purchasable: ' . ($product->is_purchasable() ? 'YES' : 'NO') . '</p>';
                echo '<p>Is in stock: ' . ($product->is_in_stock() ? 'YES' : 'NO') . '</p>';
                
                $result = WC()->cart->add_to_cart($test_pid, 1);
                echo '<p>add_to_cart result: ' . ($result ? "SUCCESS (key: $result)" : '<span style="color:red">FAILED</span>') . '</p>';
                
                if ($result) {
                    WC()->cart->maybe_set_cart_cookies();
                    if (WC()->session) {
                        WC()->session->save_data();
                    }
                    echo '<p style="color:green">Session saved. <a href="' . wc_get_cart_url() . '">Go to Cart now</a></p>';
                }

                // Show WC notices/errors
                $notices = wc_get_notices();
                if (!empty($notices)) {
                    echo '<h3>WC Notices:</h3><pre>' . print_r($notices, true) . '</pre>';
                }
            } else {
                echo '<p style="color:red">Product NOT FOUND!</p>';
            }
        }

        echo '<h2>Quick Test Links</h2>';
        echo '<p><a href="?cpd_debug_cart=1&test_product_id=24">Test add product #24</a></p>';
        echo '<p><a href="?cpd_debug_cart=1&test_product_id=90">Test add product #90</a></p>';
        echo '<p><a href="' . wc_get_cart_url() . '">Go to Cart Page</a></p>';

        exit;
    }


    /**
     * Server-side trampoline: directly adds design to cart via WC API, then redirects to cart page.
     * This bypasses ALL theme/block incompatibilities because the addition happens before any rendering.
     */
    public function handle_cpd_add_to_cart() {
        if (!isset($_GET['cpd_add_to_cart']) || !isset($_GET['cpd_design_id'])) {
            return;
        }

        $product_id = absint($_GET['cpd_add_to_cart']);
        $design_id  = absint($_GET['cpd_design_id']);
        $quantity   = isset($_GET['quantity']) ? max(1, absint($_GET['quantity'])) : 1;

        if ($product_id <= 0 || $design_id <= 0) {
            return;
        }

        // Ensure WooCommerce is fully loaded
        if (!function_exists('WC') || !WC()->cart) {
            return;
        }

        // For variable products, we need to handle them as simple products
        // by using variation_id = 0 (parent product)
        $product = wc_get_product($product_id);
        if (!$product) {
            return;
        }

        // Add product to cart using the official WooCommerce API
        $cart_item_key = WC()->cart->add_to_cart(
            $product_id,
            $quantity,
            0,       // variation_id
            array(), // variation attributes
            array('cpd_design_id' => $design_id)
        );

        // Force WooCommerce to persist the session and set cookies immediately
        if ($cart_item_key) {
            // Set cart cookies so the session persists across the redirect
            WC()->cart->maybe_set_cart_cookies();
            
            // Force save session data before redirect
            if (WC()->session) {
                WC()->session->save_data();
            }
        }

        // Redirect to the cart page (use wp_redirect, not wp_safe_redirect, to avoid host mismatch issues)
        $cart_url = wc_get_cart_url();
        wp_redirect($cart_url);
        exit;
    }



    /**
     * Register the Store API extension so cpd_design data passes through
     */
    public function register_store_api_extension() {
        if (!function_exists('woocommerce_store_api_register_endpoint_data')) {
            return;
        }

        woocommerce_store_api_register_endpoint_data(
            array(
                'endpoint'        => \Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema::IDENTIFIER,
                'namespace'       => 'cpd_design',
                'data_callback'   => array($this, 'store_api_data_callback'),
                'schema_callback' => array($this, 'store_api_schema_callback'),
                'schema_type'     => ARRAY_A,
            )
        );
    }

    public function store_api_data_callback() {
        return array(
            'design_id' => '',
        );
    }

    public function store_api_schema_callback() {
        return array(
            'design_id' => array(
                'description' => 'CPD Design ID',
                'type'        => 'string',
                'context'     => array('view', 'edit'),
                'readonly'    => true,
            ),
        );
    }

    /**
     * Add custom design data to cart item
     */
    public function add_cart_item_data($cart_item_data, $product_id, $variation_id) {
        $design_id = null;

        // 0. Check if design ID was passed directly via WC()->cart->add_to_cart() (trampoline)
        if (!empty($cart_item_data['cpd_design_id'])) {
            $design_id = intval($cart_item_data['cpd_design_id']);
        }

        // 1. Check for standard POST
        if (!$design_id && isset($_POST['cpd_design_id'])) {
            $design_id = intval($_POST['cpd_design_id']);
        }

        // 2. Fallback to query string (Redirects)
        if (!$design_id && isset($_GET['cpd_design_id'])) {
            $design_id = intval($_GET['cpd_design_id']);
        }

        // 3. Fallback to Store API JSON payload
        if (!$design_id) {
            $body = file_get_contents('php://input');
            if (!empty($body)) {
                $params = json_decode($body, true);
                if (isset($params['extensions']['cpd_design']['design_id'])) {
                    $design_id = intval($params['extensions']['cpd_design']['design_id']);
                }
            }
        }

        if ($design_id) {
            $cart_item_data['cpd_design_id'] = $design_id;
            $design = CPD_Database::get_design($design_id);
            if ($design) {
                $cart_item_data['cpd_design_urls'] = $design->file_url;
                $cart_item_data['cpd_product_color'] = $design->product_color;
                $cart_item_data['cpd_sizes_quantities'] = $design->sizes_quantities ?? '';
                $cart_item_data['cpd_fonts_used'] = $design->fonts_used ?? '';
                $cart_item_data['cpd_images_used'] = $design->images_used ?? '';
                $cart_item_data['cpd_text_content'] = $design->text_content ?? '';
                $cart_item_data['cpd_artworks_used'] = $design->artworks_used ?? '';
                $cart_item_data['cpd_names_numbers'] = $design->names_numbers ?? '';
                $cart_item_data['cpd_total_price'] = $design->total_price ?? 25.00;
                $cart_item_data['cpd_customer_notes'] = $design->customer_notes ?? '';
            }
        }

        return $cart_item_data;
    }

    /**
     * Load custom data from session
     */
    public function get_cart_item_from_session($cart_item, $values) {
        $keys = array(
            'cpd_design_id', 'cpd_design_urls', 'cpd_product_color',
            'cpd_sizes_quantities', 'cpd_fonts_used', 'cpd_images_used',
            'cpd_text_content', 'cpd_artworks_used',
            'cpd_names_numbers', 'cpd_total_price',
        );
        foreach ($keys as $key) {
            if (isset($values[$key])) {
                $cart_item[$key] = $values[$key];
            }
        }
        return $cart_item;
    }

    /**
     * Display custom data in Cart/Checkout pages — premium clean layout with modal
     */
    public function get_item_data($data, $cart_item) {
        if (!isset($cart_item['cpd_design_id'])) {
            return $data;
        }

        $design_id = $cart_item['cpd_design_id'];
        $currency  = function_exists('get_woocommerce_currency_symbol') ? get_woocommerce_currency_symbol() : '$';

        // --- 1. Design View Thumbnails (4 views) ---
        if (isset($cart_item['cpd_design_urls'])) {
            $urls = json_decode($cart_item['cpd_design_urls'], true);
            if (is_array($urls) && !empty($urls)) {
                $view_labels = array(
                    'front' => 'Front', 'back' => 'Back',
                    'rightSleeve' => 'Right', 'leftSleeve' => 'Left',
                );
                $html = '<div class="cpd-cart-design-views">';
                foreach ($urls as $view => $url) {
                    $label = isset($view_labels[$view]) ? $view_labels[$view] : ucfirst($view);
                    $html .= '<div class="cpd-cart-view-item cpd-protected-image cpd-zoom-trigger" data-img-url="' . esc_url($url) . '" title="Click to enlarge">';
                    $html .= sprintf(
                        '<img src="%1$s" class="cpd-cart-view-img" alt="%2$s" />',
                        esc_url($url), esc_attr($label)
                    );
                    $html .= '<div class="cpd-image-shield"><span class="cpd-watermark-text">PREVIEW</span></div>'; 
                    $html .= '<span class="cpd-cart-view-label">' . esc_html($label) . '</span>';
                    $html .= '</div>';
                }
                $html .= '</div>';
                $data[] = array('name' => 'Design', 'display' => $html);
            }
        }

        // --- 2. Color Swatch ---
        if (isset($cart_item['cpd_product_color'])) {
            $color = esc_attr($cart_item['cpd_product_color']);
            $data[] = array(
                'name'    => 'Color',
                'display' => sprintf('<span class="cpd-cart-color-swatch" style="background:%s;"></span> %s', $color, esc_html($color)),
            );
        }

        // --- 3. "View Details" Button + Hidden Modal Content ---
        $modal_content = $this->build_detail_modal_content($cart_item);
        if (!empty($modal_content)) {
            $modal_id = 'cpd-modal-' . $design_id;
            
            $html  = '<div class="cpd-cart-actions">';
            $html .= '<button type="button" class="cpd-view-details-btn" data-modal-id="' . $modal_id . '">';
            $html .= '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ';
            $html .= 'View Details</button>';
            $html .= '</div>';

            // Modal overlay
            $html .= '<div id="' . $modal_id . '" class="cpd-modal-overlay">';
            $html .= '<div class="cpd-modal-box">';
            $html .= '<div class="cpd-modal-header">';
            $html .= '<h3>Design Details — #' . intval($design_id) . '</h3>';
            $html .= '<button type="button" class="cpd-modal-close" data-modal-id="' . $modal_id . '">&times;</button>';
            $html .= '</div>';
            $html .= '<div class="cpd-modal-body">' . $modal_content . '</div>';
            $html .= '</div></div>';

            $data[] = array('name' => '', 'display' => $html);
        }

        return $data;
    }

    /**
     * SYNC CART TOTALS: This is the most important method for pricing.
     * It calculates the total price of the item (Design + Sizes + Extras) and 
     * tells WooCommerce to use it for the "Cart Totals" table and Checkout.
     */
    public function sync_cart_item_prices($cart) {
        if (is_admin() && !defined('DOING_AJAX')) return;
        if (did_action('woocommerce_before_calculate_totals') >= 2) return;

        foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
            if (!isset($cart_item['cpd_design_id'])) continue;

            $product = $cart_item['data'];
            $base_price = floatval($product->get_regular_price());
            $size_prices = $this->get_size_prices($cart_item, $base_price);
            $sizes = json_decode($cart_item['cpd_sizes_quantities'] ?? '{}', true);
            
            $size_total = 0;
            $total_qty = 0;
            $breakdown = array();

            foreach ($sizes as $size => $qty) {
                $qty = intval($qty);
                if ($qty <= 0) continue;
                $unit = $size_prices[$size] ?? $base_price;
                $sub = $unit * $qty;
                $size_total += $sub;
                $total_qty += $qty;
                $breakdown[] = array('size' => $size, 'unit' => $unit, 'qty' => $qty, 'sub' => $sub);
            }

            $extras = $this->calculate_extra_charges($cart_item);
            $extras_total = 0;
            foreach ($extras as $extra) {
                $extras_total += $extra['amount'];
            }

            $design_total = $size_total + $extras_total;

            // Store for display
            WC()->cart->cart_contents[$cart_item_key]['cpd_price_breakdown'] = array(
                'items'  => $breakdown,
                'extras' => $extras,
                'total'  => $design_total
            );

            if ($total_qty > 0) {
                $product->set_price($design_total / $total_qty);
            }
        }
    }

    /**
     * Rename "Price" and "Product" in Cart for our specialized layout
     */
    public function rename_cart_headers($translated_text, $text, $domain) {
        if (!is_admin() && is_cart() && $domain === 'woocommerce') {
            if ($text === 'Price') return 'Size | Unit Price';
            if ($text === 'Product') return 'Design';
        }
        return $translated_text;
    }

    public function cart_item_price_display($price_html, $cart_item, $cart_item_key) {
        if (!isset($cart_item['cpd_design_id'])) return $price_html;
        
        $breakdown = $cart_item['cpd_price_breakdown'] ?? null;
        if (!$breakdown) return $price_html;

        $currency = get_woocommerce_currency_symbol();
        $html = '<div class="cpd-unified-column cpd-price-column">';
        foreach ($breakdown['items'] as $item) {
            $html .= '<div class="cpd-unified-cell cpd-dual-cell">';
            $html .= '<span class="cpd-cell-left">' . strtoupper($item['size']) . '</span>';
            $html .= '<span class="cpd-cell-right">' . $currency . number_format($item['unit'], 2) . '</span>';
            $html .= '</div>';
        }
        // Spacer for extras
        if (!empty($breakdown['extras'])) {
            foreach ($breakdown['extras'] as $extra) {
                $html .= '<div class="cpd-unified-cell cpd-extra-label">' . $extra['label'] . '</div>';
            }
        }
        $html .= '</div>';
        return $html;
    }

    /**
     * Override standard Cart "Quantity" column to show list of inputs
     */
    public function cart_item_quantity_display($product_quantity, $cart_item_key, $cart_item = null) {
        // Handle cases where $cart_item is not passed (depends on WC version/context)
        if (!$cart_item) $cart_item = WC()->cart->get_cart_item($cart_item_key);
        if (!$cart_item || !isset($cart_item['cpd_design_id'])) return $product_quantity;

        $breakdown = $cart_item['cpd_price_breakdown'] ?? null;
        if (!$breakdown) return $product_quantity;

        $html = '<div class="cpd-unified-column">';
        foreach ($breakdown['items'] as $item) {
            $html .= '<div class="cpd-unified-cell">';
            $html .= sprintf(
                '<input type="number" name="cpd_qty[%s][%s]" value="%d" min="0" step="1" class="cpd-unified-qty-input" />',
                esc_attr($cart_item_key), esc_attr($item['size']), $item['qty']
            );
            $html .= '</div>';
        }
        // Spacer for extras
        if (!empty($breakdown['extras'])) {
            foreach ($breakdown['extras'] as $extra) {
                $html .= '<div class="cpd-unified-cell"></div>';
            }
        }
        $html .= '</div>';
        return $html;
    }

    /**
     * Override standard Cart "Subtotal" column
     */
    public function cart_item_subtotal_display($subtotal_html, $cart_item, $cart_item_key) {
        if (!isset($cart_item['cpd_design_id'])) return $subtotal_html;

        $currency = get_woocommerce_currency_symbol();
        $breakdown = $cart_item['cpd_price_breakdown'] ?? null;
        if (!$breakdown) return $subtotal_html;

        $html = '<div class="cpd-unified-column cpd-subtotal-column">';
        foreach ($breakdown['items'] as $item) {
            $html .= '<div class="cpd-unified-cell">' . $currency . number_format($item['sub'], 2) . '</div>';
        }
        
        // Extras with specialized styling
        foreach ($breakdown['extras'] as $extra) {
            $html .= sprintf(
                '<div class="cpd-unified-cell cpd-extra-cell">+%s%s</div>',
                $currency, number_format($extra['amount'], 2)
            );
        }

        // Final Subtotal in the column footer
        $html .= '<div class="cpd-unified-footer"><strong>' . $currency . number_format($breakdown['total'], 2) . '</strong></div>';
        $html .= '</div>';

        return $html;
    }

    /**
     * Get per-size prices. Currently returns the same base price for all sizes.
     * FUTURE: Override this to return different prices per size from product meta.
     *
     * @param array $cart_item  Cart item data
     * @param float $base_price Default product price
     * @return array  [ 'S' => 500, 'M' => 500, 'L' => 1000, ... ]
     */
    private function get_size_prices($cart_item, $base_price) {
        $sizes = json_decode($cart_item['cpd_sizes_quantities'] ?? '{}', true);
        $prices = array();
        
        if (is_array($sizes)) {
            foreach ($sizes as $size => $qty) {
                // Simplified: All sizes use the same base product price
                $prices[$size] = $base_price > 0 ? $base_price : 0;
            }
        }
        return $prices;
    }

    /**
     * Calculate extra charges based on design complexity.
     * Currently returns empty array (no extras).
     * FUTURE: Add rules like:
     *   - Images > 2 = +$5 per extra image
     *   - Art icons > 3 = +$3 per extra icon
     *   - Names/numbers = +$2 per entry
     *
     * @param array $cart_item  Cart item data
     * @return array [ ['label' => 'Extra images (3)', 'amount' => 5.00], ... ]
     */
    private function calculate_extra_charges($cart_item) {
        // Simplified: Returning empty array (no extra charges)
        return array();
    }

    /**
     * Build the HTML content for the "View Details" modal
     */
    private function build_detail_modal_content($cart_item) {
        $labels = array('front' => 'Front', 'back' => 'Back', 'rightSleeve' => 'Right Design', 'leftSleeve' => 'Left Design');
        $currency = get_woocommerce_currency_symbol();
        $breakdown = $cart_item['cpd_price_breakdown'] ?? null;

        $html = '<div class="cpd-modal-wrapper">';

        // Removed Pricing Summary section from modal as requested (already visible in main row)

        // Text & Art per view
        if (!empty($cart_item['cpd_text_content'])) {
            $views_data = json_decode($cart_item['cpd_text_content'], true);
            if (is_array($views_data)) {
                $is_new = !isset($views_data[0]);

                if ($is_new) {
                    foreach ($views_data as $vk => $details) {
                        if (!is_array($details)) continue;
                        if (empty($details['text']) && empty($details['art'])) continue;

                        $html .= '<div class="cpd-modal-section">';
                        $html .= '<h4>' . ($labels[$vk] ?? ucfirst($vk)) . '</h4>';

                        if (!empty($details['text']) && is_array($details['text'])) {
                            foreach ($details['text'] as $t) {
                                $dim = !empty($t['dimensions']) ? '<span class="cpd-dim">' . esc_html($t['dimensions']) . '</span>' : '';
                                $html .= '<div class="cpd-detail-row">';
                                $html .= '<span class="cpd-detail-icon">T</span>';
                                $html .= '<span>"' . esc_html($t['text']) . '"</span>';
                                $html .= '<span class="cpd-detail-meta">' . esc_html($t['font'] ?? '') . ' · ' . esc_html($t['color'] ?? '') . ' ' . $dim . '</span>';
                                $html .= '</div>';
                            }
                        }
                        if (!empty($details['art']) && is_array($details['art'])) {
                            foreach ($details['art'] as $a) {
                                $dim = !empty($a['dimensions']) ? '<span class="cpd-dim">' . esc_html($a['dimensions']) . '</span>' : '';
                                $html .= '<div class="cpd-detail-row">';
                                $html .= '<span class="cpd-detail-icon">🎨</span>';
                                $html .= '<span>' . esc_html($a['name']) . '</span>';
                                $html .= '<span class="cpd-detail-meta">' . $dim . '</span>';
                                $html .= '</div>';
                            }
                        }
                        $html .= '</div>';
                    }
                } else {
                    // Legacy
                    $html .= '<div class="cpd-modal-section"><h4>Design Elements</h4>';
                    foreach ($views_data as $t) {
                        if (!is_array($t)) continue;
                        $html .= '<div class="cpd-detail-row">';
                        $html .= '<span class="cpd-detail-icon">T</span>';
                        $html .= '<span>"' . esc_html($t['text']) . '" (' . esc_html($t['font']) . ', ' . esc_html($t['color']) . ')</span>';
                        $html .= '</div>';
                    }
                    $html .= '</div>';
                }
            }
        }

        // Fonts
        if (!empty($cart_item['cpd_fonts_used'])) {
            $fonts = json_decode($cart_item['cpd_fonts_used'], true);
            if (is_array($fonts) && !empty($fonts)) {
                $html .= '<div class="cpd-modal-section"><h4>Fonts Used</h4><div class="cpd-font-badges">';
                foreach ($fonts as $f) {
                    $html .= '<span class="cpd-cart-font-badge">' . esc_html($f) . '</span>';
                }
                $html .= '</div></div>';
            }
        }

        // Customer Notes
        if (!empty($cart_item['cpd_customer_notes'])) {
            $html .= '<div class="cpd-modal-section cpd-notes-section">';
            $html .= '<h4>📋 Customer Notes</h4>';
            $html .= '<p>' . nl2br(esc_html($cart_item['cpd_customer_notes'])) . '</p>';
            $html .= '</div>';
        }

        return $html;
    }



    /**
     * Save custom data to the Order permanently
     */
    public function add_order_item_meta($item, $cart_item_key, $values, $order) {
        $meta_keys = array(
            'cpd_design_id'        => '_cpd_design_id',
            'cpd_design_urls'      => '_cpd_design_urls',
            'cpd_product_color'    => '_cpd_product_color',
            'cpd_sizes_quantities' => '_cpd_sizes_quantities',
            'cpd_fonts_used'       => '_cpd_fonts_used',
            'cpd_images_used'      => '_cpd_images_used',
            'cpd_text_content'     => '_cpd_text_content',
            'cpd_artworks_used'    => '_cpd_artworks_used',
            'cpd_names_numbers'    => '_cpd_names_numbers',
            'cpd_customer_notes'   => '_cpd_customer_notes',
        );

        foreach ($meta_keys as $cart_key => $meta_key) {
            if (isset($values[$cart_key])) {
                $item->add_meta_data($meta_key, $values[$cart_key]);
            }
        }
    }

    /**
     * Display design thumbnails in Admin Order View
     */
    public function admin_order_item_display($item_id, $item, $order) {
        $design_urls = $item->get_meta('_cpd_design_urls');
        if ($design_urls) {
            $urls = json_decode($design_urls, true);
            if (is_array($urls)) {
                echo '<div class="cpd-order-item-designs" style="display:flex;gap:5px;margin-top:10px;">';
                foreach ($urls as $view => $url) {
                    echo '<div style="text-align:center;">';
                    echo sprintf('<a href="%s" target="_blank" title="Click to open full design" style="text-decoration:none;">', esc_url($url));
                    echo sprintf('<img src="%s" style="width:60px;height:60px;object-fit:contain;border:1px solid #eee;background:#f9f9f9;display:block;cursor:pointer;" />', esc_url($url));
                    echo '</a>';
                    echo sprintf('<small style="font-size:9px;color:#999;">%s</small>', esc_html(ucfirst($view)));
                    echo '</div>';
                }
                echo '</div>';
            }
        }
        $sizes_json = $item->get_meta('_cpd_sizes_quantities');
        if ($sizes_json) {
            $sizes = json_decode($sizes_json, true);
            if (is_array($sizes) && !empty($sizes)) {
                $size_strings = array();
                foreach ($sizes as $size => $qty) {
                    $size_strings[] = esc_html($size) . ' (Qty: ' . intval($qty) . ')';
                }
                echo '<p style="margin-top:10px;"><strong>Size Profile:</strong> ' . implode(', ', $size_strings) . '</p>';
            }
        }
        $fonts_json = $item->get_meta('_cpd_fonts_used');
        $text_json = $item->get_meta('_cpd_text_content');
        if ($text_json) {
            $views_data = json_decode($text_json, true);
            if (is_array($views_data)) {
                // Check for new format vs old format
                $is_new_format = !isset($views_data[0]);

                if ($is_new_format) {
                    $labels = array('front' => 'Front', 'back' => 'Back', 'rightSleeve' => 'Right Design', 'leftSleeve' => 'Left Design');
                    foreach ($views_data as $vk => $details) {
                        if (!is_array($details)) continue;
                        if (empty($details['text']) && empty($details['art'])) continue;
                        
                        echo '<p style="margin-top:10px; border-left: 3px solid #4361ee; padding-left: 10px;">';
                        echo '<strong>' . ($labels[$vk] ?? ucfirst($vk)) . ' Details:</strong><br>';
                        
                        if (!empty($details['text']) && is_array($details['text'])) {
                            foreach ($details['text'] as $t) {
                                $dim = !empty($t['dimensions']) ? ' [Size: ' . esc_html($t['dimensions']) . ']' : '';
                                echo '&bull; "' . esc_html($t['text']) . '" <small>(' . esc_html($t['font']) . ', ' . esc_html($t['color']) . ')' . $dim . '</small><br>';
                            }
                        }
                        if (!empty($details['art']) && is_array($details['art'])) {
                            foreach ($details['art'] as $a) {
                                $dim = !empty($a['dimensions']) ? ' [Size: ' . esc_html($a['dimensions']) . ']' : '';
                                echo '&bull; Art: ' . esc_html($a['name']) . ' <small>' . $dim . '</small><br>';
                            }
                        }
                        echo '</p>';
                    }
                } else {
                    // Legacy Format Case
                    echo '<p style="margin-top:10px;"><strong>Design Text Details:</strong><br>';
                    foreach ($views_data as $t) {
                        if (!is_array($t)) continue;
                        echo '&bull; "' . esc_html($t['text']) . '" <small>(Font: ' . esc_html($t['font']) . ', Color: ' . esc_html($t['color']) . ')</small><br>';
                    }
                    echo '</p>';
                }
            }
        }

        $notes = $item->get_meta('_cpd_customer_notes');
        if ($notes) {
            echo '<p style="margin-top:10px; background:#fffcf0; padding:10px; border:1px solid #ffeeba; border-radius:4px;">';
            echo '<strong>📋 Customer Instructions:</strong><br>';
            echo '<em>' . nl2br(esc_html($notes)) . '</em>';
            echo '</p>';
        }
    }

    /**
     * Add custom CSS for cart/checkout pages
     */
    public function add_cart_styles() {
        if (!is_cart() && !is_checkout()) {
            return;
        }
        ?>
        <style>
        /* ====== CPD Premium Cart Styles ====== */

        /* Design Views Grid */
        .cpd-cart-design-views {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin: 8px 0;
        }
        .cpd-cart-view-item {
            text-align: center;
            background: #f8f9fa;
            border: 1px solid #e2e5ea;
            border-radius: 10px;
            padding: 6px;
            transition: all 0.25s ease;
        }
        .cpd-cart-view-item:hover {
            border-color: #6366f1;
            box-shadow: 0 4px 12px rgba(99,102,241,0.15);
            transform: translateY(-2px);
        }
        .cpd-cart-view-img {
            width: 70px;
            height: 70px;
            object-fit: contain;
            border-radius: 6px;
            display: block;
            margin: 0 auto;
        }
        .cpd-cart-view-label {
            display: block;
            font-size: 9px;
            font-weight: 700;
            color: #888;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }

        /* Color Swatch */
        .cpd-cart-color-swatch {
            width: 18px;
            height: 18px;
            display: inline-block;
            border-radius: 50%;
            border: 2px solid #ddd;
            vertical-align: middle;
            margin-right: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        /* ====== Price Breakdown Table ====== */
        .cpd-cart-price-table {
            width: 100%;
            max-width: 320px;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 12px;
            margin: 8px 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e5ea;
        }
        .cpd-cart-price-table thead th {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: #fff;
            padding: 8px 10px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            font-weight: 600;
        }
        .cpd-cart-price-table tbody td {
            padding: 6px 10px;
            border-bottom: 1px solid #f0f0f5;
            color: #333;
        }
        .cpd-cart-price-table tbody tr:nth-child(even) td {
            background: #fafaff;
        }
        .cpd-size-cell {
            font-weight: 600;
            color: #4f46e5;
        }
        .cpd-extra-row td {
            background: #fffbeb !important;
            color: #92400e;
            font-size: 11px;
            font-style: italic;
        }
        .cpd-price-total-row td {
            border-top: 2px solid #6366f1 !important;
            background: #eef2ff !important;
            border-bottom: none !important;
        }
        .cpd-cart-qty-input {
            width: 48px !important;
            padding: 4px 4px !important;
            height: auto !important;
            font-size: 12px !important;
            text-align: center;
            border: 1px solid #d1d5db;
            border-radius: 6px;
        }

        /* ====== View Details Button ====== */
        .cpd-view-details-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 16px;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: #fff !important;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.3px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(99,102,241,0.25);
        }
        .cpd-view-details-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(99,102,241,0.35);
            background: linear-gradient(135deg, #818cf8, #6366f1);
        }
        .cpd-view-details-btn svg {
            flex-shrink: 0;
        }

        /* ====== Modal Overlay ====== */
        .cpd-modal-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15,23,42,0.6);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 999999;
            justify-content: center;
            align-items: center;
            padding: 20px;
            animation: cpdFadeIn 0.2s ease;
        }
        .cpd-modal-overlay.cpd-modal-open {
            display: flex;
        }
        @keyframes cpdFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes cpdSlideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .cpd-modal-box {
            background: #fff;
            border-radius: 16px;
            max-width: 520px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 25px 60px rgba(0,0,0,0.2);
            animation: cpdSlideUp 0.3s ease;
        }
        .cpd-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            border-bottom: 1px solid #f0f0f5;
            background: linear-gradient(135deg, #f8faff, #eef2ff);
            border-radius: 16px 16px 0 0;
        }
        .cpd-modal-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
        }
        .cpd-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #94a3b8;
            line-height: 1;
            padding: 0 4px;
            transition: color 0.2s;
        }
        .cpd-modal-close:hover {
            color: #ef4444;
        }
        .cpd-modal-body {
            padding: 20px 24px;
        }

        /* Modal Sections */
        .cpd-modal-section {
            margin-bottom: 16px;
            padding-bottom: 14px;
            border-bottom: 1px solid #f0f0f5;
        }
        .cpd-modal-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .cpd-modal-section h4 {
            margin: 0 0 10px;
            font-size: 13px;
            font-weight: 700;
            color: #4f46e5;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .cpd-detail-row {
            display: flex;
            align-items: baseline;
            gap: 8px;
            padding: 5px 0;
            font-size: 13px;
            color: #334155;
        }
        .cpd-detail-icon {
            width: 22px;
            height: 22px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #eef2ff;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            color: #4f46e5;
            flex-shrink: 0;
        }
        .cpd-detail-meta {
            margin-left: auto;
            font-size: 11px;
            color: #94a3b8;
        }
        .cpd-dim {
            background: #f1f5f9;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 10px;
        }
        .cpd-font-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .cpd-cart-font-badge {
            display: inline-block;
            padding: 3px 10px;
            background: #eef2ff;
            color: #4f46e5;
            border: 1px solid #c7d2fe;
            border-radius: 14px;
            font-size: 11px;
            font-weight: 500;
        }
        .cpd-notes-section {
            background: #fffbeb;
            padding: 12px 16px !important;
            border-radius: 10px;
            border: 1px solid #fde68a !important;
        }
        .cpd-notes-section h4 {
            color: #92400e !important;
        }
        .cpd-notes-section p {
            margin: 0;
            font-size: 13px;
            color: #78350f;
            line-height: 1.5;
        }

        /* WooCommerce Overrides */
        .woocommerce-cart-form .product-name dl.variation dt,
        .woocommerce-cart-form .product-name dl.variation dd {
            display: block;
        }
        .woocommerce-cart-form .product-name dl.variation dd p {
            margin: 0;
        }

        /* ====== UNIFIED COLUMN LAYOUT (Single Parent Table Look) ====== */
        .cpd-unified-column {
            display: flex;
            flex-direction: column;
            min-width: 80px;
        }
        .cpd-unified-cell {
            height: 48px; /* Strict height to ensure horizontal lock across all columns */
            display: flex;
            align-items: center;
            padding: 0 10px;
            border-bottom: 1px solid #f1f5f9;
            box-sizing: border-box; /* Crucial for vertical alignment */
        }
        .cpd-size-column .cpd-unified-cell {
            font-weight: 700;
            color: #1e293b;
            background: #f8fafc;
        }
        .cpd-extra-label {
            height: 36px !important; /* Slightly smaller for extras */
            color: #92400e;
            font-style: italic;
            font-size: 11px;
            background: #fffcf0 !important;
        }
        .cpd-extra-cell {
            height: 36px !important;
            color: #92400e;
            font-weight: 600;
            justify-content: flex-end;
            background: #fffcf0 !important;
        }
        .cpd-subtotal-column .cpd-unified-cell {
            justify-content: flex-end;
            text-align: right;
        }
        .cpd-unified-qty-input {
            width: 54px !important;
            height: 32px !important;
            padding: 0 4px !important;
            text-align: center;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
            margin: 0 auto !important;
        }
        /* ====== UNIFIED COLUMN LAYOUT (Size | Unit Price) ====== */
        .woocommerce-cart-form .cart_item td {
            vertical-align: top !important;
            padding-top: 20px !important; /* Forces all columns to start at same baseline */
            padding-bottom: 20px !important;
        }

        .cpd-unified-column {
            display: flex;
            flex-direction: column;
            min-width: 140px;
            margin: 0;
            padding: 0;
        }
        .cpd-unified-cell {
            height: 48px;
            display: flex;
            align-items: center;
            padding: 0 12px;
            border-bottom: 1px solid #f1f5f9;
            box-sizing: border-box;
            background: transparent;
        }
        .cpd-dual-cell {
            justify-content: space-between;
        }
        .cpd-cell-left {
            font-weight: 700;
            color: #1e293b;
            background: #f1f5f9;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            min-width: 32px;
            text-align: center;
        }
        .cpd-cell-right {
            color: #475569;
            font-weight: 500;
        }
        .cpd-extra-label {
            height: 38px !important;
            color: #92400e;
            font-style: italic;
            font-size: 11px;
            background: #fffcf0 !important;
            border-bottom: 1px solid #fef3c7;
        }
        .cpd-extra-cell {
            height: 38px !important;
            color: #92400e;
            font-weight: 600;
            justify-content: flex-end;
            background: #fffcf0 !important;
        }
        .cpd-subtotal-column {
            min-width: 120px;
        }
        .cpd-subtotal-column .cpd-unified-cell {
            justify-content: flex-end;
            text-align: right;
        }
        .cpd-unified-qty-input {
            width: 52px !important;
            height: 32px !important;
            text-align: center;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
            margin: 0 auto !important;
        }
        .cpd-unified-footer {
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 0 15px;
            background: #f8fafc;
            border-top: 2px solid #e2e8f0;
            color: #4338ca;
            font-size: 16px;
            margin-top: 10px;
            border-radius: 0 0 6px 6px;
            font-weight: 800;
        }

        /* Clean up variations list */
        .woocommerce-cart-form dl.variation {
            margin: 0 !important;
            padding: 0 !important;
        }
        .woocommerce-cart-form dl.variation dt { display: none !important; }
        .woocommerce-cart-form dl.variation dd { margin: 0 !important; padding: 0 !important; }

        /* ====== DESIGN SHIELD PROTECTION ====== */
        .cpd-protected-image {
            position: relative;
            user-select: none;
            -webkit-user-drag: none;
        }
        .cpd-protected-image img {
            pointer-events: none; /* Disables clicking/dragging on the actual img */
            user-select: none;
        }
        .cpd-image-shield {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10;
            background: rgba(255,255,255,0); /* Completely transparent but is "above" the image */
            cursor: default;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .cpd-watermark-text {
            font-size: 14px;
            font-weight: 900;
            color: rgba(0,0,0,0.15); /* Semi-transparent watermark */
            text-transform: uppercase;
            transform: rotate(-45deg);
            white-space: nowrap;
            pointer-events: none;
            user-select: none;
        }

        /* ====== PROTECTED ZOOM MODAL (Lightbox) ====== */
        .cpd-zoom-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 999999;
            display: none;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .cpd-zoom-overlay.cpd-zoom-active {
            display: flex;
            opacity: 1;
        }
        .cpd-zoom-content {
            position: relative;
            max-width: 90%;
            max-height: 90%;
            box-shadow: 0 0 50px rgba(0,0,0,0.5);
            background: #fff;
            padding: 10px;
            border-radius: 8px;
        }
        .cpd-zoom-img {
            max-width: 100%;
            max-height: 80vh;
            display: block;
        }
        .cpd-zoom-close {
            position: absolute;
            top: -40px;
            right: -40px;
            color: #fff;
            font-size: 40px;
            cursor: pointer;
            background: none;
            border: none;
        }
        .cpd-zoom-watermark {
            font-size: 80px; /* Much larger in zoom view */
            color: rgba(0,0,0,0.1);
        }

        /* Responsive styling */
        @media (max-width: 800px) {
            .woocommerce-cart-form .cart_item td { padding: 10px !important; }
            .cpd-unified-cell { height: auto; padding: 10px; }
        }

        /* Modal Subtitles */
        .cpd-modal-subtitle {
            margin: 20px 0 10px 0 !important;
            padding-bottom: 5px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 16px !important;
            color: #1e293b !important;
        }
        .cpd-modal-section {
            margin-bottom: 25px;
        }

        /* Hide standard redundant columns for CPD items */
        .woocommerce-cart-form .cart_item:has(.cpd-cart-breakdown-wrapper) td.product-price,
        .woocommerce-cart-form .cart_item:has(.cpd-cart-breakdown-wrapper) td.product-quantity {
            display: none;
        }
        
        /* Expand the subtotal cell to fill space */
        .woocommerce-cart-form .cart_item:has(.cpd-cart-breakdown-wrapper) td.product-subtotal {
            width: 55%;
            padding-left: 0 !important;
        }

        /* Responsive */
        @media (max-width: 800px) {
            .woocommerce-cart-form .cart_item:has(.cpd-cart-breakdown-wrapper) td.product-price,
            .woocommerce-cart-form .cart_item:has(.cpd-cart-breakdown-wrapper) td.product-quantity {
                display: block; /* Show on mobile for layout safety */
            }
        }

        /* Cart Actions */
        .cpd-cart-actions {
            margin-top: 12px;
        }

        /* Responsive */
        @media (max-width: 600px) {
            .cpd-cart-design-views {
                grid-template-columns: repeat(2, 1fr);
            }
            .cpd-cart-price-table {
                max-width: 100%;
            }
            .cpd-modal-box {
                max-height: 90vh;
            }
        }
        </style>
        <?php
    }


    /**
     * Process updates to the custom size matrix when "Update Cart" is clicked
     */
    public function process_custom_cart_updates($cart_updated) {
        if (!isset($_POST['cpd_qty']) || !is_array($_POST['cpd_qty'])) {
            return $cart_updated;
        }

        foreach ($_POST['cpd_qty'] as $cart_item_key => $sizes) {
            // Get the item from the cart
            $cart_item = WC()->cart->get_cart_item($cart_item_key);
            if (!$cart_item || !isset($cart_item['cpd_design_id'])) {
                continue;
            }

            // Update sizes quantities in cart session
            $new_sizes = array();
            $new_total_qty = 0;
            foreach ($sizes as $size => $qty) {
                $qty = max(0, intval($qty));
                $new_sizes[$size] = $qty;
                $new_total_qty += $qty;
            }

            WC()->cart->cart_contents[$cart_item_key]['cpd_sizes_quantities'] = wp_json_encode($new_sizes);
            
            // Sync the main WooCommerce item quantity
            if ($new_total_qty > 0) {
                WC()->cart->set_quantity($cart_item_key, $new_total_qty, false);
            } else {
                // If total is 0, we could remove the item, but usually user should click "Remove"
                // For now, let's keep it at 1 or whatever standard behavior
            }
        }

        return $cart_updated;
    }
    /**
     * Footer scripts for Modal interaction
     */
    public function add_cart_scripts() {
        if (!is_cart() && !is_checkout()) return;
        ?>
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Function to handle modal open
            document.body.addEventListener('click', function(e) {
                const btn = e.target.closest('.cpd-view-details-btn');
                if (btn) {
                    const modalId = btn.getAttribute('data-modal-id');
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        modal.classList.add('cpd-modal-open');
                        document.body.style.overflow = 'hidden'; // Prevent scroll
                    }
                }

                // Handle Close
                const closeBtn = e.target.closest('.cpd-modal-close');
                const overlay = e.target.closest('.cpd-modal-overlay');
                
                if (closeBtn || (overlay && e.target === overlay)) {
                    const activeModal = document.querySelector('.cpd-modal-overlay.cpd-modal-open');
                    if (activeModal) {
                        activeModal.classList.remove('cpd-modal-open');
                        document.body.style.overflow = '';
                    }
                }
            });

            // Close on ESC
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const activeModal = document.querySelector('.cpd-modal-overlay.cpd-modal-open');
                    if (activeModal) {
                        activeModal.classList.remove('cpd-modal-open');
                        document.body.style.overflow = '';
                    }
                }
            });

            // --- DESIGN SHIELD: Disable right-click on protected images ---
            document.addEventListener('contextmenu', function(e) {
                if (e.target.closest('.cpd-protected-image')) {
                    e.preventDefault();
                    return false;
                }
            });

            // --- PROTECTED ZOOM HANDLER ---
            const zoomOverlay = document.createElement('div');
            zoomOverlay.className = 'cpd-zoom-overlay';
            zoomOverlay.innerHTML = `
                <div class="cpd-zoom-content cpd-protected-image">
                    <button type="button" class="cpd-zoom-close">&times;</button>
                    <img src="" class="cpd-zoom-img" alt="Zoom Preview" />
                    <div class="cpd-image-shield"><span class="cpd-watermark-text cpd-zoom-watermark">PREVIEW</span></div>
                </div>
            `;
            document.body.appendChild(zoomOverlay);

            const zoomImg = zoomOverlay.querySelector('.cpd-zoom-img');
            const closeBtn = zoomOverlay.querySelector('.cpd-zoom-close');

            document.body.addEventListener('click', function(e) {
                const trigger = e.target.closest('.cpd-zoom-trigger');
                if (trigger) {
                    const url = trigger.getAttribute('data-img-url');
                    if (url) {
                        zoomImg.src = url;
                        zoomOverlay.classList.add('cpd-zoom-active');
                        document.body.style.overflow = 'hidden';
                    }
                }

                if (e.target === zoomOverlay || e.target === closeBtn) {
                    zoomOverlay.classList.remove('cpd-zoom-active');
                    document.body.style.overflow = '';
                }
            });
        });
        </script>
        <?php
    }
}
