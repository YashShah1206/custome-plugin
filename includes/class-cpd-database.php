<?php
if (!defined('ABSPATH')) {
    exit;
}

class CPD_Database {

    public static function create_tables() {
        global $wpdb;
        $table_name      = $wpdb->prefix . 'cpd_designs';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL DEFAULT 0,
            file_path varchar(500) DEFAULT '',
            file_url varchar(500) DEFAULT '',
            filename varchar(200) DEFAULT '',
            product_color varchar(20) DEFAULT '#ffffff',
            product_name varchar(200) DEFAULT '',
            product_type varchar(100) DEFAULT '',
            total_price decimal(10,2) DEFAULT 25.00,
            names_numbers longtext DEFAULT '',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    public static function save_design($data) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';

        $result = $wpdb->insert($table_name, array(
            'user_id'       => isset($data['user_id'])       ? intval($data['user_id'])             : 0,
            'file_path'     => isset($data['file_path'])     ? sanitize_text_field($data['file_path']) : '',
            'file_url'      => isset($data['file_url'])      ? esc_url_raw($data['file_url'])          : '',
            'filename'      => isset($data['filename'])      ? sanitize_file_name($data['filename'])   : '',
            'product_color' => isset($data['product_color']) ? $data['product_color']                  : '#ffffff',
            'product_name'  => isset($data['product_name'])  ? sanitize_text_field($data['product_name']) : '',
            'product_type'  => isset($data['product_type'])  ? sanitize_text_field($data['product_type']) : '',
            'total_price'   => isset($data['total_price'])   ? floatval($data['total_price'])          : 25.00,
            'names_numbers' => isset($data['names_numbers']) ? $data['names_numbers']                  : '',
        ));

        return ($result === false) ? false : $wpdb->insert_id;
    }

    public static function get_all_designs() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';
        return $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC");
    }

    public static function get_designs_by_user($user_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';
        return $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM $table_name WHERE user_id = %d ORDER BY created_at DESC", $user_id)
        );
    }

    public static function get_design($id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';
        return $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $id)
        );
    }
}
