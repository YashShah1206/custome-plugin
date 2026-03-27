<?php
if (!defined('ABSPATH')) {
    exit;
}

class CPD_Rest_API {

    public function register_routes() {
        // Save design as PNG image file(s)
        register_rest_route('cpd/v1', '/save-image', array(
            'methods'             => 'POST',
            'callback'            => array($this, 'save_image'),
            'permission_callback' => '__return_true',
        ));

        // Get all designs
        register_rest_route('cpd/v1', '/designs', array(
            array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_designs'),
                'permission_callback' => '__return_true',
            ),
        ));

        // Upload image asset
        register_rest_route('cpd/v1', '/upload', array(
            'methods'             => 'POST',
            'callback'            => array($this, 'upload_image'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Save design as PNG files — supports multiple views (front, back, sleeve)
     */
    public function save_image($request) {
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
        $upload_dir  = wp_upload_dir();
        $base_dir    = $upload_dir['basedir'];
        $date_folder = date('Y-m-d');
        $save_dir    = $base_dir . '/cpd-designs/' . $date_folder;

        if (!file_exists($save_dir)) {
            wp_mkdir_p($save_dir);
        }

        $timestamp = date('Ymd-His');
        $random    = substr(md5(uniqid()), 0, 6);
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

            $view_clean = sanitize_file_name($view);
            $filename   = 'design-' . $view_clean . '-' . $timestamp . '-' . $random . '.png';
            $file_path  = $save_dir . '/' . $filename;
            $file_url   = $upload_dir['baseurl'] . '/cpd-designs/' . $date_folder . '/' . $filename;

            $bytes_written = file_put_contents($file_path, $image_binary);
            if ($bytes_written !== false) {
                $saved_files[$view_clean] = array(
                    'filename'  => $filename,
                    'file_path' => $file_path,
                    'file_url'  => $file_url,
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
            $all_urls[$view]     = $info['file_url'];
            $all_paths[$view]    = $info['file_path'];
            $all_filenames[$view] = $info['filename'];
        }

        // Save record in DB — store URLs as JSON
        $data = array(
            'user_id'       => get_current_user_id(),
            'file_path'     => wp_json_encode($all_paths),
            'file_url'      => wp_json_encode($all_urls),
            'filename'      => wp_json_encode($all_filenames),
            'product_color' => isset($params['product_color']) ? sanitize_hex_color($params['product_color']) : '#ffffff',
            'product_name'  => isset($params['product_name']) ? sanitize_text_field($params['product_name']) : '',
            'product_type'  => isset($params['product_type']) ? sanitize_text_field($params['product_type']) : '',
            'total_price'   => isset($params['total_price']) ? floatval($params['total_price']) : 25.00,
            'names_numbers' => isset($params['names_numbers']) ? wp_json_encode($params['names_numbers']) : '',
        );

        $id = CPD_Database::save_design($data);

        if ($id === false) {
            return new WP_Error('db_failed', 'Failed to save design record', array('status' => 500));
        }

        return rest_ensure_response(array(
            'success'   => true,
            'id'        => $id,
            'filenames' => $all_filenames,
            'file_urls' => $all_urls,
            'message'   => count($saved_files) . ' view(s) saved successfully!',
        ));
    }

    /**
     * Get all designs
     */
    public function get_designs($request) {
        $designs = CPD_Database::get_all_designs();
        return rest_ensure_response($designs);
    }

    /**
     * Upload an image asset to WordPress Media Library
     */
    public function upload_image($request) {
        $files = $request->get_file_params();

        if (empty($files['file'])) {
            return new WP_Error('no_file', 'No file uploaded', array('status' => 400));
        }

        require_once(ABSPATH . 'wp-admin/includes/image.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');

        $attachment_id = media_handle_upload('file', 0);

        if (is_wp_error($attachment_id)) {
            return $attachment_id;
        }

        return rest_ensure_response(array(
            'success' => true,
            'url'     => wp_get_attachment_url($attachment_id),
            'id'      => $attachment_id,
        ));
    }
}
