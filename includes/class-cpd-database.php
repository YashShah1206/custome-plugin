<?php
if (!defined('ABSPATH')) {
    exit;
}

class CPD_Database {

    /**
     * Ensure the sizes_quantities column exists (safe to call repeatedly).
     */
    public static function maybe_add_sizes_quantities_column() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';

        // Quick check — bail if table doesn't exist yet
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
            return;
        }

        $row = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'sizes_quantities'");
        if (empty($row)) {
            $wpdb->query("ALTER TABLE $table_name ADD sizes_quantities LONGTEXT DEFAULT NULL");
        }
    }

    /**
     * Ensure fonts_used and images_used columns exist (safe to call repeatedly).
     */
    public static function maybe_add_design_metadata_columns() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';

        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
            return;
        }

        $row = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'fonts_used'");
        if (empty($row)) {
            $wpdb->query("ALTER TABLE $table_name ADD fonts_used LONGTEXT DEFAULT NULL");
        }

        $row2 = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'images_used'");
        if (empty($row2)) {
            $wpdb->query("ALTER TABLE $table_name ADD images_used LONGTEXT DEFAULT NULL");
        }
    }

    /**
     * Ensure text_content and artworks_used columns exist (safe to call repeatedly).
     */
    public static function maybe_add_text_content_columns() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';

        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
            return;
        }

        $row = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'text_content'");
        if (empty($row)) {
            $wpdb->query("ALTER TABLE $table_name ADD text_content LONGTEXT DEFAULT NULL");
        }

        $row2 = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'artworks_used'");
        if (empty($row2)) {
            $wpdb->query("ALTER TABLE $table_name ADD artworks_used LONGTEXT DEFAULT NULL");
        }
    }
    
    /**
     * Ensure customer_notes column exists.
     */
    public static function maybe_add_customer_notes_column() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';

        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
            return;
        }

        $row = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'customer_notes'");
        if (empty($row)) {
            $wpdb->query("ALTER TABLE $table_name ADD customer_notes LONGTEXT DEFAULT NULL");
        }
    }

    /**
     * Ensure product_id column exists.
     */
    public static function maybe_add_product_id_column() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';

        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") !== $table_name) {
            return;
        }

        $row = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'product_id'");
        if (empty($row)) {
            $wpdb->query("ALTER TABLE $table_name ADD product_id bigint(20) DEFAULT 0 AFTER user_id");
        }
    }

    public static function create_tables() {
        global $wpdb;
        $table_name      = $wpdb->prefix . 'cpd_designs';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL DEFAULT 0,
            product_id bigint(20) NOT NULL DEFAULT 0,
            file_path longtext,
            file_url longtext,
            filename longtext,
            product_color varchar(20) DEFAULT '#ffffff',
            product_name varchar(200) DEFAULT '',
            product_type varchar(100) DEFAULT '',
            total_price decimal(10,2) DEFAULT 25.00,
            names_numbers longtext DEFAULT '',
            sizes_quantities longtext DEFAULT '',
            fonts_used longtext DEFAULT '',
            images_used longtext DEFAULT '',
            text_content longtext DEFAULT '',
            artworks_used longtext DEFAULT '',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        // dbDelta often fails to alter varchar to text on existing setups, so we force it
        $wpdb->query("ALTER TABLE $table_name MODIFY file_path LONGTEXT");
        $wpdb->query("ALTER TABLE $table_name MODIFY file_url LONGTEXT");
        $wpdb->query("ALTER TABLE $table_name MODIFY filename LONGTEXT");

        // Dynamically add columns if they don't exist
        self::maybe_add_product_id_column();
        self::maybe_add_sizes_quantities_column();
        self::maybe_add_design_metadata_columns();
        self::maybe_add_text_content_columns();
        self::maybe_add_customer_notes_column();
    }

    public static function save_design($data) {
        // Ensure all columns exist before inserting
        self::maybe_add_product_id_column();
        self::maybe_add_sizes_quantities_column();
        self::maybe_add_design_metadata_columns();
        self::maybe_add_text_content_columns();
        self::maybe_add_customer_notes_column();

        global $wpdb;
        $table_name = $wpdb->prefix . 'cpd_designs';

        $query = $wpdb->prepare(
            "INSERT INTO $table_name 
            (user_id, product_id, file_path, file_url, filename, product_color, product_name, product_type, total_price, names_numbers, sizes_quantities, fonts_used, images_used, text_content, artworks_used, customer_notes) 
            VALUES (%d, %d, %s, %s, %s, %s, %s, %s, %f, %s, %s, %s, %s, %s, %s, %s)",
            isset($data['user_id'])       ? intval($data['user_id'])             : 0,
            isset($data['product_id'])    ? intval($data['product_id'])          : 0,
            isset($data['file_path'])     ? $data['file_path']                  : '',
            isset($data['file_url'])      ? $data['file_url']                   : '',
            isset($data['filename'])      ? $data['filename']                   : '',
            isset($data['product_color']) ? $data['product_color']              : '#ffffff',
            isset($data['product_name'])  ? sanitize_text_field($data['product_name']) : '',
            isset($data['product_type'])  ? sanitize_text_field($data['product_type']) : '',
            isset($data['total_price'])   ? floatval($data['total_price'])      : 25.00,
            isset($data['names_numbers']) ? $data['names_numbers']              : '',
            isset($data['sizes_quantities']) ? $data['sizes_quantities']        : '',
            isset($data['fonts_used'])    ? $data['fonts_used']                 : '',
            isset($data['images_used'])   ? $data['images_used']               : '',
            isset($data['text_content'])  ? $data['text_content']              : '',
            isset($data['artworks_used']) ? $data['artworks_used']             : '',
            isset($data['customer_notes']) ? $data['customer_notes']            : ''
        );

        $result = $wpdb->query($query);

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
