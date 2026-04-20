<?php
if (!defined('ABSPATH')) {
    exit;
}

class CPD_Woo_Hooks {
    public function __construct() {
        // Add button to Single Product Page
        add_action('woocommerce_after_add_to_cart_form', [$this, 'add_start_designing_button'], 10);
    }

    public function add_start_designing_button() {
        global $product;
        if (!$product) return;
        
        $product_id = $product->get_id();
        
        // Find if there's a page with [product_designer] shortcode
        // Hardcoding /design-studio/ for now. User needs to create a WP Page with this slug.
        $designer_page_url = site_url('/design-studio/') . '?product_id=' . $product_id . '&start_customizing=1';
        
        echo '<div class="cpd-button-container" style="margin-top: 20px; margin-bottom: 25px;">';
        echo '<style>
            .cpd-start-design-btn {
                display: block;
                width: 100%;
                padding: 15px 20px;
                background: #2d6b3f !important;
                color: #fff !important;
                text-align: center;
                text-decoration: none !important;
                font-weight: 700;
                font-size: 16px;
                border-radius: 8px;
                transition: all 0.3s ease;
                border: none;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                line-height: 1.2;
            }
            .cpd-start-design-btn:hover {
                background: #245432 !important;
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(0,0,0,0.15);
                color: #fff !important;
            }
        </style>';
        echo '<a href="' . esc_url($designer_page_url) . '" class="cpd-start-design-btn">🎨 Start Designing Now</a>';
        echo '</div>';
    }
}
new CPD_Woo_Hooks();
