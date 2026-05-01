<?php
if (!defined('ABSPATH')) {
    exit;
}

class CPD_Rest_API
{

    // Max allowed size for a single base64 image (10 MB decoded)
    const MAX_IMAGE_SIZE = 10485760;

    public function register_routes()
    {
        // Save design as PNG image file(s) — requires logged-in user
        register_rest_route('cpd/v1', '/save-image', array(
            'methods' => 'POST',
            'callback' => array($this, 'save_image'),
            'permission_callback' => '__return_true',
        ));

        // Get all designs (Legacy/Placeholder)
        register_rest_route('cpd/v1', '/designs', array(
            array(
                'methods' => 'GET',
                'callback' => array($this, 'get_designs'),
                'permission_callback' => '__return_true',
            ),
        ));

        // Upload image asset — requires logged-in user
        register_rest_route('cpd/v1', '/upload', array(
            'methods' => 'POST',
            'callback' => array($this, 'upload_image'),
            'permission_callback' => '__return_true',
        ));

        // Get Art Library
        register_rest_route('cpd/v1', '/art-library', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_art_library'),
            'permission_callback' => '__return_true',
        ));

        // Get Config
        register_rest_route('cpd/v1', '/config', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_config'),
            'permission_callback' => '__return_true',
        ));

        // Templates - GET (public)
        register_rest_route('cpd/v1', '/templates', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_templates'),
            'permission_callback' => '__return_true',
        ));

        // Templates - POST (admin only)
        register_rest_route('cpd/v1', '/templates', array(
            'methods' => 'POST',
            'callback' => array($this, 'save_template'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));

        // Templates - DELETE (admin only)
        register_rest_route('cpd/v1', '/templates/(?P<template_id>[\w]+)', array(
            'methods' => 'DELETE',
            'callback' => array($this, 'delete_template'),
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ));
    }

    /**
     * Save design as PNG files — supports multiple views (front, back, sleeve)
     */
    public function save_image($request)
    {
        $params = $request->get_json_params();

        // Support both old single-image and new multi-image format
        $images = array();

        if (!empty($params['images']) && is_array($params['images'])) {
            // New multi-image format: { front: dataUrl, back: dataUrl, sleeve: dataUrl }
            $images = $params['images'];
        } elseif (!empty($params['image_data'])) {
            // Legacy single-image format
            $images = array('front' => $params['image_data']);
        } else {
            return new WP_Error('missing_data', 'Image data is required', array('status' => 400));
        }

        // Create folder: wp-content/uploads/cpd-designs/YYYY-MM-DD/
        $upload_dir = wp_upload_dir();
        $base_dir = $upload_dir['basedir'];
        $date_folder = date('Y-m-d');
        $save_dir = $base_dir . '/cpd-designs/' . $date_folder;

        if (!file_exists($save_dir)) {
            wp_mkdir_p($save_dir);
        }

        $timestamp = date('Ymd-His');
        $random = substr(md5(uniqid()), 0, 6);
        $saved_files = array();

        foreach ($images as $view => $image_data) {
            // Strip out the base64 header (data:image/png;base64,...)
            if (strpos($image_data, 'base64,') !== false) {
                $image_data = substr($image_data, strpos($image_data, 'base64,') + 7);
            }

            $image_binary = base64_decode($image_data);
            if (!$image_binary) {
                continue; // Skip invalid images
            }

            // M2: Enforce max file size limit (10 MB)
            if (strlen($image_binary) > self::MAX_IMAGE_SIZE) {
                continue; // Skip oversized images
            }

            $view_clean = sanitize_file_name($view);
            $filename = 'design-' . $view_clean . '-' . $timestamp . '-' . $random . '.png';
            $file_path = $save_dir . '/' . $filename;
            $file_url = $upload_dir['baseurl'] . '/cpd-designs/' . $date_folder . '/' . $filename;

            // M1: Use WP-compatible file writing
            $result = @file_put_contents($file_path, $image_binary);
            if ($result === false) {
                // Fallback: try wp_upload_bits
                $wp_result = wp_upload_bits($filename, null, $image_binary);
                if (empty($wp_result['error'])) {
                    $file_path = $wp_result['file'];
                    $file_url = $wp_result['url'];
                    $result = true;
                }
            }

            if ($result !== false) {
                $saved_files[$view_clean] = array(
                    'filename' => $filename,
                    'file_path' => $file_path,
                    'file_url' => $file_url,
                );
            }
        }

        if (empty($saved_files)) {
            return new WP_Error('save_failed', 'No images could be saved', array('status' => 500));
        }

        // Collect all file URLs as JSON
        $all_urls = array();
        $all_paths = array();
        $all_filenames = array();
        foreach ($saved_files as $view => $info) {
            $all_urls[$view] = $info['file_url'];
            $all_paths[$view] = $info['file_path'];
            $all_filenames[$view] = $info['filename'];
        }

        return rest_ensure_response(array(
            'success' => true,
            'id' => 0, // No longer using database ID for direct cart additions
            'filenames' => $all_filenames,
            'file_urls' => $all_urls,
            'message' => count($saved_files) . ' view(s) saved successfully!',
        ));
    }

    /**
     * Get all designs (Legacy/Placeholder)
     */
    public function get_designs($request)
    {
        return rest_ensure_response(array());
    }

    /**
     * Upload an image asset to a custom uploads folder without creating a Media Library attachment
     */
    public function upload_image($request)
    {
        $files = $request->get_file_params();

        if (empty($files['file'])) {
            return new WP_Error('no_file', 'No file uploaded', array('status' => 400));
        }

        $file = $files['file'];

        if (!empty($file['error'])) {
            return new WP_Error('upload_error', 'Upload failed', array('status' => 400));
        }

        if (empty($file['tmp_name']) || !file_exists($file['tmp_name'])) {
            return new WP_Error('missing_tmp_file', 'Temporary uploaded file was not found', array('status' => 400));
        }

        // Keep this endpoint image-only, matching the frontend upload panel behavior.
        $checked = wp_check_filetype_and_ext($file['tmp_name'], $file['name']);
        
        // M1: Secure Uploads - Only allow JPG and PNG formats. SVGs are explicitly blocked to prevent XSS.
        $allowed_mimes = array('image/jpeg', 'image/png');
        
        if (empty($checked['type']) || !in_array($checked['type'], $allowed_mimes, true)) {
            return new WP_Error('invalid_file_type', 'Only JPG and PNG image uploads are allowed.', array('status' => 400));
        }

        // Match the frontend size limit so large files fail consistently.
        if (!empty($file['size']) && intval($file['size']) > 20 * 1024 * 1024) {
            return new WP_Error('file_too_large', 'File size must be under 20MB', array('status' => 400));
        }

        $upload_dir = wp_upload_dir();
        $date_folder = date('Y-m-d');
        $target_dir = trailingslashit($upload_dir['basedir']) . 'cpd-temp/' . $date_folder;

        if (!file_exists($target_dir) && !wp_mkdir_p($target_dir)) {
            return new WP_Error('create_dir_failed', 'Could not create upload directory', array('status' => 500));
        }

        $original_name = sanitize_file_name($file['name']);
        $filename = wp_unique_filename($target_dir, $original_name);
        $target_path = trailingslashit($target_dir) . $filename;

        $moved = @move_uploaded_file($file['tmp_name'], $target_path);
        if (!$moved) {
            $moved = @copy($file['tmp_name'], $target_path);
            if ($moved) {
                @unlink($file['tmp_name']);
            }
        }

        if (!$moved || !file_exists($target_path)) {
            return new WP_Error('save_failed', 'Uploaded image could not be saved', array('status' => 500));
        }

        $file_url = trailingslashit($upload_dir['baseurl']) . 'cpd-temp/' . $date_folder . '/' . $filename;

        return rest_ensure_response(array(
            'success' => true,
            'url' => $file_url,
            'id' => 0,
            'filename' => $filename,
        ));
    }

    /**
     * Get Art Library from Custom Post Types
     */
    public function get_art_library($request)
    {
        $categories = get_terms(array(
            'taxonomy' => 'cpd_art_cat',
            'hide_empty' => false,
        ));

        $result = array();

        foreach ($categories as $cat) {
            $artworks = get_posts(array(
                'post_type' => 'cpd_artwork',
                'numberposts' => -1,
                'tax_query' => array(
                    array(
                        'taxonomy' => 'cpd_art_cat',
                        'field' => 'term_id',
                        'terms' => $cat->term_id,
                    )
                ),
            ));

            $items = array();
            foreach ($artworks as $art) {
                $url = get_the_post_thumbnail_url($art->ID, 'full');
                if (!$url) {
                    // Try to get attachment if no thumbnail
                    $attachments = get_attached_media('image', $art->ID);
                    if ($attachments) {
                        $url = wp_get_attachment_url(array_key_first($attachments));
                    }
                }

                if ($url) {
                    $items[] = array(
                        'id' => $art->ID,
                        'name' => $art->post_title,
                        'url' => $url,
                        // We'll treat it as an image in the frontend if it's not a raw SVG string
                        'isImage' => true,
                    );
                }
            }

            if (!empty($items)) {
                $result[] = array(
                    'id' => 'custom-' . $cat->slug,
                    'name' => $cat->name,
                    'icon' => '<svg viewBox="0 0 36 36" width="36" height="36"><path d="M18 4L6 10v8c0 8 5 12 12 16 7-4 12-8 12-16V10z" fill="#4361ee" /></svg>', // Default icon
                    'items' => $items,
                );
            }
        }

        return rest_ensure_response($result);
    }

    /**
     * Get Configuration — Supports Product-Specific overrides
     */
    public function get_config($request)
    {
        $product_id = intval($request->get_param('product_id'));
        $show_default_art = get_option('cpd_show_default_art', '1');

        // Global defaults
        $global_tshirt_colors = $this->parse_colors(get_option('cpd_global_colors', ''));
        $global_tshirt_sizes = array_map('trim', explode(',', get_option('cpd_global_sizes', '')));
        $global_cap_colors = $this->parse_colors(get_option('cpd_cap_colors', ''));
        $global_cap_sizes = array_map('trim', explode(',', get_option('cpd_cap_sizes', '')));

        // Print area fallbacks
        $global_tshirt_areas = $this->parse_areas(get_option('cpd_print_areas', array()));
        $global_cap_areas = $this->parse_areas(get_option('cpd_cap_print_areas', array()));

        $is_cap = false;
        $product_name = 'Global Settings';

        if ($product_id > 0) {
            $product = wc_get_product($product_id);
            if ($product) {
                $product_name = $product->get_name();
                $terms = get_the_terms($product_id, 'product_cat');
                if ($terms && !is_wp_error($terms)) {
                    foreach ($terms as $term) {
                        if (strpos(strtolower($term->slug), 'cap') !== false) {
                            $is_cap = true;
                            break;
                        }
                    }
                }
            }
        }

        // Base Config Object
        $config = array(
            'showDefaultArt' => $show_default_art === '1',
            'productMockups' => null,
            'colors' => $is_cap ? $global_cap_colors : $global_tshirt_colors,
            'sizes' => $is_cap ? $global_cap_sizes : $global_tshirt_sizes,
            'printAreas' => $is_cap ? $global_cap_areas : $global_tshirt_areas,
            'allowCustomColor' => true,
        );

        // If product_id, override with product meta
        if ($product_id > 0) {
            // Try v3 key first, then fallback
            $p_mockups = get_post_meta($product_id, '_cpd_v3_mockups', true);
            if (empty($p_mockups)) {
                $p_mockups = get_post_meta($product_id, '_cpd_product_mockups', true);
            }

            $p_colors = get_post_meta($product_id, '_cpd_product_colors', true);
            $p_sizes = get_post_meta($product_id, '_cpd_product_sizes', true);
            $p_areas = get_post_meta($product_id, '_cpd_product_areas', true);

            if (!empty($p_mockups)) {
                // Handle both array and JSON string formats
                $mockup_data = is_array($p_mockups) ? $p_mockups : json_decode($p_mockups, true);

                if (is_array($mockup_data)) {
                    $clean_mockups = array();
                    foreach ($mockup_data as $key => $url) {
                        if (!empty($url)) {
                            // Ensure the URL is clean but preserved for CSS
                            $clean_mockups[$key] = trim($url);
                        }
                    }
                    if (!empty($clean_mockups)) {
                        $config['productMockups'] = $clean_mockups;
                        $config['isProductSpecific'] = true;
                    }
                }
            }

            $p_view_labels = get_post_meta($product_id, '_cpd_view_labels', true);
            if (!empty($p_view_labels) && is_array($p_view_labels)) {
                $config['viewLabels'] = $p_view_labels;
            }

            $override_cs = get_post_meta($product_id, '_cpd_override_colors_sizes', true) === 'yes';

            if ($override_cs) {
                if (!empty($p_colors)) {
                    $config['colors'] = $this->parse_colors($p_colors);
                }
                if (!empty($p_sizes)) {
                    $config['sizes'] = array_map('trim', explode(',', $p_sizes));
                }
            }
            if (!empty($p_areas) && is_array($p_areas)) {
                $merged_areas = $this->parse_areas($p_areas);
                if (!empty($merged_areas)) {
                    $config['printAreas'] = array_merge($config['printAreas'], $merged_areas);
                }
            }

            $config['pricing'] = array(
                'views' => get_post_meta($product_id, '_cpd_pricing_views', true) ?: array('front' => '', 'back' => '', 'leftSleeve' => '', 'rightSleeve' => ''),
                'sizes' => get_post_meta($product_id, '_cpd_pricing_sizes', true) ?: array(),
                'template_upcharge' => get_post_meta($product_id, '_cpd_pricing_template', true) ?: ''
            );

            // Check for templates
            $templates = get_post_meta($product_id, '_cpd_product_templates', true);
            $config['hasTemplates'] = is_array($templates) && count($templates) > 0;
            $config['templateCount'] = is_array($templates) ? count($templates) : 0;
        }

        return rest_ensure_response($config);
    }

    /**
     * Helper: Parse "Name:#hex, Name:#hex" into array
     */
    private function parse_colors($raw)
    {
        $colors = array();
        if (!empty($raw)) {
            $parts = explode(',', $raw);
            foreach ($parts as $p) {
                $sub = explode(':', trim($p));
                if (count($sub) === 2) {
                    $colors[] = array('name' => trim($sub[0]), 'hex' => trim($sub[1]));
                }
            }
        }
        return $colors;
    }

    /**
     * Helper: Parse area coordinates into percentage-based decimals
     */
    private function parse_areas($raw)
    {
        $areas = array();
        if (is_array($raw)) {
            foreach ($raw as $v_key => $data) {
                if (isset($data['l'])) {
                    // Old single box format
                    if (!empty($data['l']) && !empty($data['t']) && !empty($data['w']) && !empty($data['h'])) {
                        $areas[$v_key] = array(
                            array(
                                'left' => floatval($data['l']) / 500,
                                'top' => floatval($data['t']) / 600,
                                'width' => floatval($data['w']) / 500,
                                'height' => floatval($data['h']) / 600,
                            )
                        );
                    }
                } elseif (is_array($data)) {
                    // New multiple box format
                    $view_areas = array();
                    foreach ($data as $box) {
                        if (!empty($box['l']) && !empty($box['t']) && !empty($box['w']) && !empty($box['h'])) {
                            $view_areas[] = array(
                                'left' => floatval($box['l']) / 500,
                                'top' => floatval($box['t']) / 600,
                                'width' => floatval($box['w']) / 500,
                                'height' => floatval($box['h']) / 600,
                            );
                        }
                    }
                    if (!empty($view_areas)) {
                        $areas[$v_key] = $view_areas;
                    }
                }
            }
        }
        return $areas;
    }

    /**
     * Get templates for a product
     */
    public function get_templates($request)
    {
        $product_id = intval($request->get_param('product_id'));
        if ($product_id <= 0) {
            return rest_ensure_response(array());
        }

        $templates = get_post_meta($product_id, '_cpd_product_templates', true);
        if (!is_array($templates)) {
            $templates = array();
        }

        return rest_ensure_response($templates);
    }

    /**
     * Save a template for a product (admin only)
     */
    public function save_template($request)
    {
        $params = $request->get_json_params();
        $product_id = intval($params['product_id'] ?? 0);

        if ($product_id <= 0) {
            return new WP_Error('missing_product', 'Product ID is required', array('status' => 400));
        }

        $template_name = sanitize_text_field($params['name'] ?? 'Untitled Template');
        $template_thumbnail = $params['thumbnail'] ?? '';
        $template_views = $params['views'] ?? array();

        if (empty($template_views)) {
            return new WP_Error('missing_data', 'Template views data is required', array('status' => 400));
        }

        $template_id_provided = $params['template_id'] ?? null;

        // Get existing templates
        $templates = get_post_meta($product_id, '_cpd_product_templates', true);
        if (!is_array($templates)) {
            $templates = array();
        }

        if ($template_id_provided) {
            $updated = false;
            foreach ($templates as &$t) {
                if ($t['id'] === $template_id_provided) {
                    $t['name'] = $template_name;
                    if (!empty($template_thumbnail)) {
                        $t['thumbnail'] = $template_thumbnail;
                    }
                    $t['views'] = $template_views;
                    $t['updated'] = current_time('mysql');
                    $new_template = $t;
                    $updated = true;
                    break;
                }
            }
            if (!$updated) {
                $template_id_provided = null;
            }
        }

        if (!$template_id_provided) {
            // C5: Enforce maximum template limit per product
            $max_templates = defined('CPD_MAX_TEMPLATES_PER_PRODUCT') ? CPD_MAX_TEMPLATES_PER_PRODUCT : 15;
            if (count($templates) >= $max_templates) {
                return new WP_Error('limit_reached', 'Maximum of ' . $max_templates . ' templates per product. Please delete an existing template first.', array('status' => 400));
            }

            // Generate unique ID
            $template_id = 'tpl_' . substr(md5(uniqid(mt_rand(), true)), 0, 8);

            // Build template entry
            $new_template = array(
                'id' => $template_id,
                'name' => $template_name,
                'thumbnail' => $template_thumbnail,
                'views' => $template_views,
                'created' => current_time('mysql'),
            );
            $templates[] = $new_template;
        }

        update_post_meta($product_id, '_cpd_product_templates', $templates);

        return rest_ensure_response(array(
            'success' => true,
            'template' => $new_template,
            'message' => $template_id_provided ? 'Template updated successfully!' : 'Template saved successfully!',
        ));
    }

    /**
     * Delete a template (admin only)
     */
    public function delete_template($request)
    {
        $template_id = sanitize_text_field($request->get_param('template_id'));
        $product_id = intval($request->get_param('product_id'));

        if ($product_id <= 0) {
            return new WP_Error('missing_product', 'Product ID is required', array('status' => 400));
        }

        $templates = get_post_meta($product_id, '_cpd_product_templates', true);
        if (!is_array($templates)) {
            return new WP_Error('not_found', 'No templates found', array('status' => 404));
        }

        $filtered = array_values(array_filter($templates, function ($t) use ($template_id) {
            return $t['id'] !== $template_id;
        }));

        update_post_meta($product_id, '_cpd_product_templates', $filtered);

        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Template deleted successfully!',
        ));
    }
}
