<?php
if (!defined('ABSPATH')) {
    exit;
}

class CPD_Admin
{
    public function __construct()
    {
        add_action('init', array($this, 'register_art_cpt'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Allow SVG Uploads
        add_filter('upload_mimes', array($this, 'allow_svg_upload'));
        add_filter('wp_check_filetype_and_ext', array($this, 'fix_svg_mime_type'), 10, 4);
        
        // Handle Bulk Upload
        add_action('admin_init', array($this, 'handle_bulk_upload'));

        // C3: Sanitize SVG files on upload
        add_filter('wp_handle_upload_prefilter', array($this, 'sanitize_svg_on_upload'));

        // Hide default submenus
        add_action('admin_menu', array($this, 'remove_default_art_submenus'), 999);

        // Product Specific Config
        add_action('add_meta_boxes', array($this, 'add_product_meta_box'));
        add_action('save_post_product', array($this, 'save_product_config'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
    }

    /**
     * Allow SVG uploads (admin only for security)
     */
    public function allow_svg_upload($mimes) {
        if (current_user_can('manage_options')) {
            $mimes['svg'] = 'image/svg+xml';
        }
        return $mimes;
    }

    /**
     * Fix SVG mime type issue in some WP versions
     */
    public function fix_svg_mime_type($data, $file, $filename, $mimes) {
        $ext = isset($data['ext']) ? $data['ext'] : '';
        if (empty($ext)) {
            $exploded = explode('.', $filename);
            $ext = strtolower(end($exploded));
        }
        if ($ext === 'svg') {
            $data['type'] = 'image/svg+xml';
            $data['ext']  = 'svg';
        }
        return $data;
    }

    /**
     * C3: Sanitize SVG files on upload — strip scripts, event handlers, and external references
     */
    public function sanitize_svg_on_upload($file) {
        if (!isset($file['type'])) {
            return $file;
        }

        // Check if file is SVG by extension or mime
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($ext !== 'svg' && $file['type'] !== 'image/svg+xml') {
            return $file;
        }

        $content = file_get_contents($file['tmp_name']);
        if (empty($content)) {
            return $file;
        }

        $sanitized = $this->sanitize_svg_content($content);
        if ($sanitized === false) {
            $file['error'] = 'This SVG file contains potentially dangerous content and was rejected.';
            return $file;
        }

        file_put_contents($file['tmp_name'], $sanitized);
        return $file;
    }

    /**
     * Strip dangerous elements and attributes from SVG content
     */
    private function sanitize_svg_content($content) {
        // Reject if it contains PHP tags
        if (preg_match('/<\?php/i', $content)) {
            return false;
        }

        // Remove script tags and their contents
        $content = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $content);

        // Remove on* event handler attributes (onclick, onload, onerror, etc.)
        $content = preg_replace('/\s+on\w+\s*=\s*["\'][^"\']*["\']/i', '', $content);
        $content = preg_replace('/\s+on\w+\s*=\s*[^\s>]+/i', '', $content);

        // Remove javascript: URLs in href/xlink:href attributes
        $content = preg_replace('/href\s*=\s*["\']\s*javascript:[^"\']*["\']/i', 'href="#"', $content);
        $content = preg_replace('/xlink:href\s*=\s*["\']\s*javascript:[^"\']*["\']/i', 'xlink:href="#"', $content);

        // Remove <foreignObject> tags (can embed arbitrary HTML)
        $content = preg_replace('/<foreignObject[^>]*>.*?<\/foreignObject>/is', '', $content);

        // Remove <use> tags with external references
        $content = preg_replace('/<use[^>]*href\s*=\s*["\']https?:[^"\']*["\']/i', '<use href="#"', $content);

        // Remove data: URIs that could contain encoded scripts
        $content = preg_replace('/href\s*=\s*["\']\s*data:[^"\']*["\']/i', 'href="#"', $content);

        return $content;
    }

    /**
     * Register Artwork CPT and Category Taxonomy
     */
    public function register_art_cpt()
    {
        // Category Taxonomy
        register_taxonomy('cpd_art_cat', 'cpd_artwork', array(
            'labels' => array(
                'name' => 'Art Categories',
                'singular_name' => 'Art Category',
            ),
            'hierarchical' => true,
            'show_ui' => true,
            'show_in_menu' => false, // Hide from sidebar
            'show_admin_column' => true,
            'show_in_rest' => true,
        ));

        // Artwork Post Type
        register_post_type('cpd_artwork', array(
            'labels' => array(
                'name' => 'Art Library',
                'singular_name' => 'Artwork',
                'add_new' => 'Add New Art',
                'add_new_item' => 'Add New Art',
                'edit_item' => 'Edit Artwork',
            ),
            'public' => false,
            'show_ui' => true,
            'supports' => array('title', 'thumbnail'),
            'show_in_rest' => true,
            'menu_icon' => 'dashicons-art',
        ));
    }

    /**
     * Add menu items
     */
    public function add_admin_menu()
    {
        // 1. Unified Art Library Dashboard (Top of the list)
        add_submenu_page(
            'edit.php?post_type=cpd_artwork',
            'Art Library Dashboard',
            'Art Dashboard',
            'manage_options',
            'cpd-art-dashboard',
            array($this, 'render_art_dashboard')
        );

        // 2. Main Category Settings (Tabbed)
        add_submenu_page(
            'edit.php?post_type=cpd_artwork',
            'Product Design Settings',
            'Product Design Setting',
            'manage_options',
            'cpd-settings',
            array($this, 'render_settings_page')
        );

        // 3. Settings (General Configuration & Module Status)
        add_submenu_page(
            'edit.php?post_type=cpd_artwork',
            'Settings',
            'Settings',
            'manage_options',
            'cpd-module-status',
            array($this, 'render_module_status_page')
        );
        
        // Remove the old Bulk Import menu as it's now in the dashboard
    }

    /**
     * Remove default submenus to simplify sidebar
     */
    public function remove_default_art_submenus()
    {
        // Remove "All Artworks" (the first redundant submenu)
        remove_submenu_page('edit.php?post_type=cpd_artwork', 'edit.php?post_type=cpd_artwork');
        // Remove "Add New Art"
        remove_submenu_page('edit.php?post_type=cpd_artwork', 'post-new.php?post_type=cpd_artwork');
        // Remove "Art Categories"
        remove_submenu_page('edit.php?post_type=cpd_artwork', 'edit-tags.php?taxonomy=cpd_art_cat&post_type=cpd_artwork');
    }

    /**
     * Register settings
     */
    public function register_settings()
    {
        // Group 1: Module Status & General Config
        register_setting('cpd_status_group', 'cpd_show_default_art');
        register_setting('cpd_status_group', 'cpd_enable_tshirt');
        register_setting('cpd_status_group', 'cpd_enable_cap');
        register_setting('cpd_status_group', 'cpd_cleanup_days');
        
        // Group 2: Category Specific Settings (Colors, Sizes, Areas)
        register_setting('cpd_cat_group', 'cpd_allow_custom_color');
        register_setting('cpd_cat_group', 'cpd_global_colors');
        register_setting('cpd_cat_group', 'cpd_global_sizes');
        
        register_setting('cpd_cat_group', 'cpd_cap_allow_custom_color');
        register_setting('cpd_cat_group', 'cpd_cap_colors');
        register_setting('cpd_cat_group', 'cpd_cap_sizes');

        register_setting('cpd_cat_group', 'cpd_print_areas');
        register_setting('cpd_cat_group', 'cpd_cap_print_areas');
    }

    /**
     * Handle ZIP Bulk Upload
     */
    public function handle_bulk_upload()
    {
        if (!isset($_POST['cpd_bulk_upload_nonce']) || !wp_verify_nonce($_POST['cpd_bulk_upload_nonce'], 'cpd_bulk_upload_action')) {
            return;
        }

        if (!current_user_can('manage_options') || empty($_FILES['cpd_zip_file']['tmp_name'])) {
            return;
        }

        $zip_file = $_FILES['cpd_zip_file']['tmp_name'];
        $cat_id = intval($_POST['cpd_bulk_cat_id']);

        if ($cat_id <= 0) {
            add_settings_error('cpd_settings_group', 'no_cat', 'Please select a category for bulk upload.', 'error');
            return;
        }

        if (!class_exists('ZipArchive')) {
            add_settings_error('cpd_settings_group', 'no_zip', 'ZipArchive PHP extension is not enabled on your server.', 'error');
            return;
        }

        $zip = new ZipArchive();
        if ($zip->open($zip_file) === TRUE) {
            $upload_dir = wp_upload_dir();
            $temp_dir = $upload_dir['basedir'] . '/cpd-bulk-' . uniqid();
            
            if (!wp_mkdir_p($temp_dir)) {
                add_settings_error('cpd_settings_group', 'mkdir_fail', 'Failed to create extraction directory: ' . $temp_dir, 'error');
                return;
            }

            $zip->extractTo($temp_dir);
            $zip->close();

            $files = scandir($temp_dir);
            $count = 0;

            require_once(ABSPATH . 'wp-admin/includes/image.php');
            require_once(ABSPATH . 'wp-admin/includes/file.php');
            require_once(ABSPATH . 'wp-admin/includes/media.php');

            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;
                
                $file_path = $temp_dir . '/' . $file;
                if (is_dir($file_path)) continue;

                $filetype = wp_check_filetype($file, null);
                $allowed = array('image/jpeg', 'image/png', 'image/gif', 'image/svg+xml');

                if (in_array($filetype['type'], $allowed)) {
                    // 1. Upload to Media Library
                    $file_array = array(
                        'name'     => $file,
                        'tmp_name' => $file_path,
                    );
                    $attachment_id = media_handle_sideload($file_array, 0);

                    if (!is_wp_error($attachment_id)) {
                        // 2. Create Artwork Post
                        $name = pathinfo($file, PATHINFO_FILENAME);
                        $art_id = wp_insert_post(array(
                            'post_title'   => $name,
                            'post_type'    => 'cpd_artwork',
                            'post_status'  => 'publish',
                        ));

                        if ($art_id) {
                            set_post_thumbnail($art_id, $attachment_id);
                            wp_set_object_terms($art_id, $cat_id, 'cpd_art_cat');
                            $count++;
                        }
                    }
                }
            }

            // M3: Cleanup with proper error handling
            foreach ($files as $file) {
                if ($file !== '.' && $file !== '..') {
                    $filepath = $temp_dir . '/' . $file;
                    if (is_file($filepath)) {
                        wp_delete_file($filepath);
                    }
                }
            }
            if (is_dir($temp_dir)) {
                rmdir($temp_dir);
            }

            add_settings_error('cpd_settings_group', 'bulk_success', "Successfully imported $count artworks into the category.", 'updated');
        } else {
            add_settings_error('cpd_settings_group', 'zip_fail', 'Failed to open the ZIP file.', 'error');
        }
    }

    /**
     * Render the Module Status / General Setup page
     */
    public function render_module_status_page()
    {
        $show_default = get_option('cpd_show_default_art', '1');
        $enable_tshirt = get_option('cpd_enable_tshirt', '1');
        $enable_cap = get_option('cpd_enable_cap', '1');
        ?>
        <div class="wrap">
            <h1>Settings</h1>
            <p>Enable or disable specific categories and features of the designer.</p>
            <form method="post" action="options.php">
                <?php settings_fields('cpd_status_group'); ?>
                
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Show Default Art Library</th>
                        <td>
                            <input type="checkbox" name="cpd_show_default_art" value="1" <?php checked('1', $show_default); ?> />
                            <p class="description">Enable built-in emojis and shapes in the designer.</p>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Enable T-Shirt Module</th>
                        <td>
                            <input type="checkbox" name="cpd_enable_tshirt" value="1" <?php checked('1', $enable_tshirt); ?> />
                            <p class="description">Show T-Shirt settings in the Product Design Setting menu.</p>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Enable Cap Module</th>
                        <td>
                            <input type="checkbox" name="cpd_enable_cap" value="1" <?php checked('1', $enable_cap); ?> />
                            <p class="description">Show Cap settings in the Product Design Setting menu.</p>
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Auto-Delete Design Images After (Days)</th>
                        <td>
                            <input type="number" name="cpd_cleanup_days" value="<?php echo esc_attr(get_option('cpd_cleanup_days', '0')); ?>" min="0" max="3650" style="width: 80px;" />
                            <p class="description">Set to <strong>0</strong> = never delete (images stay forever). Set to <strong>5</strong> = delete images older than 5 days. Recommended: <strong>0</strong> or <strong>365</strong>.</p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    /**
     * Render the main Product Design Settings (Tabbed/Button UI)
     */
    public function render_settings_page()
    {
        $enable_tshirt = get_option('cpd_enable_tshirt', '1');
        $enable_cap    = get_option('cpd_enable_cap', '1');

        $colors = get_option('cpd_global_colors', '');
        $sizes = get_option('cpd_global_sizes', '');
        $allow_custom_color = get_option('cpd_allow_custom_color', '1');
        
        $cap_colors = get_option('cpd_cap_colors', '');
        $cap_sizes = get_option('cpd_cap_sizes', '');
        $cap_allow_custom = get_option('cpd_cap_allow_custom_color', '1');
        ?>
        <style>
            .cpd-admin-tabs { margin: 20px 0; border-bottom: 2px solid #ccd0d4; padding-bottom: 10px; }
            .cpd-tab-btn { 
                padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; 
                border: 1px solid #ccd0d4; background: #f6f7f7; color: #1d2327; 
                margin-right: 5px; border-radius: 4px; transition: all 0.2s;
            }
            .cpd-tab-btn:hover { background: #fff; border-color: #2271b1; color: #2271b1; }
            .cpd-tab-btn.active { background: #2271b1; color: #fff; border-color: #2271b1; }
            .cpd-tab-content { display: none; background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px; margin-top: 20px; }
            .cpd-tab-content.active { display: block; }
            .cpd-quick-add { margin-top: 10px; padding: 12px; background: #f8f9fa; border: 1px solid #ccd0d4; border-radius: 4px; display: inline-block; }
        </style>

        <div class="wrap">
            <h1>Product Design Settings</h1>
            <p>Select a category below to manage its specific configuration.</p>

            <div class="cpd-admin-tabs">
                <?php if ($enable_tshirt === '1'): ?>
                <button type="button" class="cpd-tab-btn active" data-tab="tshirt-config">👕 T-Shirt Configuration</button>
                <?php endif; ?>
                
                <?php if ($enable_cap === '1'): ?>
                <button type="button" class="cpd-tab-btn <?php echo ($enable_tshirt !== '1') ? 'active' : ''; ?>" data-tab="cap-config">🧢 Cap Configuration</button>
                <?php endif; ?>

                <?php if ($enable_tshirt !== '1' && $enable_cap !== '1'): ?>
                    <p style="color: #d63638; font-weight: bold;">All categories are currently disabled. Please enable them in the <a href="<?php echo admin_url('edit.php?post_type=cpd_artwork&page=cpd-module-status'); ?>">Settings</a> page.</p>
                <?php endif; ?>
            </div>

            <form method="post" action="options.php">
                <?php settings_fields('cpd_cat_group'); ?>

                <?php if ($enable_tshirt === '1'): ?>
                <!-- T-Shirt Content -->
                <div id="tshirt-config" class="cpd-tab-content active">
                    <h2>T-Shirt Configuration</h2>
                    <table class="form-table">
                        <tr valign="top">
                            <th scope="row">Enable Custom Colors & Sizes</th>
                            <td>
                                <input type="checkbox" name="cpd_allow_custom_color" value="1" <?php checked('1', $allow_custom_color); ?> />
                                <p class="description">If checked, custom colors/sizes below will be used.</p>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row">Colors</th>
                            <td>
                                <textarea name="cpd_global_colors" rows="5" cols="50" placeholder="Red:#ff0000, Blue:#0000ff"><?php echo esc_textarea($colors); ?></textarea>
                                <div class="cpd-quick-add">
                                    <strong>Quick Add Color:</strong><br/>
                                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
                                        <input type="text" id="cpd_tshirt_color_name" placeholder="Name" style="width: 120px;" />
                                        <input type="color" id="cpd_tshirt_color_hex" value="#4361ee" style="width: 40px; height: 28px; padding: 0;" />
                                        <button type="button" class="button" onclick="cpd_add_color_to_list('cpd_tshirt_color_name', 'cpd_tshirt_color_hex', 'cpd_global_colors')">Add</button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row">Sizes</th>
                            <td>
                                <input type="text" name="cpd_global_sizes" value="<?php echo esc_attr($sizes); ?>" class="large-text" placeholder="S, M, L, XL" />
                            </td>
                        </tr>
                    </table>

                    <hr />
                    <h3>T-Shirt Print Areas</h3>
                    <table class="form-table">
                        <?php
                        $views = array('front' => 'Front', 'back' => 'Back', 'rightSleeve' => 'Right Sleeve', 'leftSleeve' => 'Left Sleeve');
                        $saved_areas = get_option('cpd_print_areas', array());
                        foreach ($views as $v_key => $v_label):
                            $v_data = isset($saved_areas[$v_key]) ? $saved_areas[$v_key] : array('l' => '', 't' => '', 'w' => '', 'h' => '');
                        ?>
                        <tr valign="top">
                            <th scope="row"><?php echo $v_label; ?></th>
                            <td>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    L: <input type="number" name="cpd_print_areas[<?php echo $v_key; ?>][l]" value="<?php echo esc_attr($v_data['l']); ?>" style="width: 60px;" />
                                    T: <input type="number" name="cpd_print_areas[<?php echo $v_key; ?>][t]" value="<?php echo esc_attr($v_data['t']); ?>" style="width: 60px;" />
                                    W: <input type="number" name="cpd_print_areas[<?php echo $v_key; ?>][w]" value="<?php echo esc_attr($v_data['w']); ?>" style="width: 60px;" />
                                    H: <input type="number" name="cpd_print_areas[<?php echo $v_key; ?>][h]" value="<?php echo esc_attr($v_data['h']); ?>" style="width: 60px;" />
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
                <?php endif; ?>

                <?php if ($enable_cap === '1'): ?>
                <!-- Cap Content -->
                <div id="cap-config" class="cpd-tab-content <?php echo ($enable_tshirt !== '1') ? 'active' : ''; ?>">
                    <h2>Cap Configuration</h2>
                    <table class="form-table">
                        <tr valign="top">
                            <th scope="row">Enable Custom Colors & Sizes</th>
                            <td>
                                <input type="checkbox" name="cpd_cap_allow_custom_color" value="1" <?php checked('1', $cap_allow_custom); ?> />
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row">Colors</th>
                            <td>
                                <textarea name="cpd_cap_colors" rows="5" cols="50" placeholder="Red:#ff0000"><?php echo esc_textarea($cap_colors); ?></textarea>
                                <div class="cpd-quick-add">
                                    <strong>Quick Add Color:</strong><br/>
                                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
                                        <input type="text" id="cpd_cap_color_name" placeholder="Name" style="width: 120px;" />
                                        <input type="color" id="cpd_cap_color_hex" value="#1a237e" style="width: 40px; height: 28px; padding: 0;" />
                                        <button type="button" class="button" onclick="cpd_add_color_to_list('cpd_cap_color_name', 'cpd_cap_color_hex', 'cpd_cap_colors')">Add</button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row">Sizes</th>
                            <td>
                                <input type="text" name="cpd_cap_sizes" value="<?php echo esc_attr($cap_sizes); ?>" class="large-text" placeholder="S, M, L" />
                            </td>
                        </tr>
                    </table>

                    <hr />
                    <h3>Cap Print Areas</h3>
                    <table class="form-table">
                        <?php
                        $views_cap = array('front' => 'Front', 'back' => 'Back', 'rightSleeve' => 'Right', 'leftSleeve' => 'Left');
                        $cap_saved_areas = get_option('cpd_cap_print_areas', array());
                        foreach ($views_cap as $v_key => $v_label):
                            $v_data = isset($cap_saved_areas[$v_key]) ? $cap_saved_areas[$v_key] : array('l' => '', 't' => '', 'w' => '', 'h' => '');
                        ?>
                        <tr valign="top">
                            <th scope="row"><?php echo $v_label; ?></th>
                            <td>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    L: <input type="number" name="cpd_cap_print_areas[<?php echo $v_key; ?>][l]" value="<?php echo esc_attr($v_data['l']); ?>" style="width: 60px;" />
                                    T: <input type="number" name="cpd_cap_print_areas[<?php echo $v_key; ?>][t]" value="<?php echo esc_attr($v_data['t']); ?>" style="width: 60px;" />
                                    W: <input type="number" name="cpd_cap_print_areas[<?php echo $v_key; ?>][w]" value="<?php echo esc_attr($v_data['w']); ?>" style="width: 60px;" />
                                    H: <input type="number" name="cpd_cap_print_areas[<?php echo $v_key; ?>][h]" value="<?php echo esc_attr($v_data['h']); ?>" style="width: 60px;" />
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
                <?php endif; ?>

                <?php if ($enable_tshirt === '1' || $enable_cap === '1'): ?>
                <div style="margin-top: 20px;">
                    <?php submit_button(); ?>
                </div>
                <?php endif; ?>
            </form>
        </div>

        <script>
        // Tab switching logic
        document.querySelectorAll('.cpd-tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.cpd-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.cpd-tab-content').forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                const targetId = this.getAttribute('data-tab');
                const target = document.getElementById(targetId);
                if (target) target.classList.add('active');
            });
        });

        // Quick add color helper
        function cpd_add_color_to_list(nameId, hexId, textareaName) {
            const nameInput = document.getElementById(nameId);
            const hexInput = document.getElementById(hexId);
            const textarea = document.getElementsByName(textareaName)[0];
            const name = nameInput.value.trim();
            const hex = hexInput.value.trim();
            if (!name) return alert('Enter name');
            let currentVal = textarea.value.trim();
            const newVal = name + ':' + hex;
            textarea.value = currentVal ? (currentVal.endsWith(',') ? currentVal + ' ' + newVal : currentVal + ', ' + newVal) : newVal;
            nameInput.value = '';
            nameInput.focus();
        }
        </script>
        <?php
    }

    /**
     * Render Unified Art Library Dashboard
     */
    public function render_art_dashboard()
    {
        $categories = get_terms(array(
            'taxonomy' => 'cpd_art_cat',
            'hide_empty' => false,
        ));
        ?>
        <style>
            .cpd-art-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px; }
            .cpd-art-card { 
                background: #fff; border: 1px solid #ccd0d4; border-radius: 8px; padding: 20px; 
                display: flex; flex-direction: column; align-items: center; text-align: center;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .cpd-art-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .cpd-art-icon { font-size: 40px; margin-bottom: 15px; }
            .cpd-art-card h3 { margin: 0 0 10px 0; font-size: 18px; }
            .cpd-art-card p { color: #646970; margin-bottom: 20px; font-size: 14px; }
            .cpd-art-card .button { width: 100%; }
            .cpd-bulk-section { background: #fff; border: 1px solid #ccd0d4; border-radius: 8px; padding: 25px; margin-top: 30px; }
        </style>

        <div class="wrap">
            <h1>Art Library Dashboard</h1>
            <p>Manage all your designer assets from one unified location.</p>

            <div class="cpd-art-grid">
                <!-- Manage Artworks -->
                <div class="cpd-art-card">
                    <div class="cpd-art-icon">🖼️</div>
                    <h3>View All Artwork</h3>
                    <p>Browse and edit the icons, emojis, and shapes already in your library.</p>
                    <a href="edit.php?post_type=cpd_artwork" class="button button-secondary">Open Library</a>
                </div>

                <!-- Add New -->
                <div class="cpd-art-card">
                    <div class="cpd-art-icon">➕</div>
                    <h3>Add New Artwork</h3>
                    <p>Upload a single design or icon to use in the design studio.</p>
                    <a href="post-new.php?post_type=cpd_artwork" class="button button-secondary">Add New Art</a>
                </div>

                <!-- Categories -->
                <div class="cpd-art-card">
                    <div class="cpd-art-icon">📁</div>
                    <h3>Manage Categories</h3>
                    <p>Create and organize categories like Emojis, Sports, Symbols, etc.</p>
                    <a href="edit-tags.php?taxonomy=cpd_art_cat&post_type=cpd_artwork" class="button button-secondary">Edit Categories</a>
                </div>
            </div>

            <!-- Bulk Import Section -->
            <div class="cpd-bulk-section">
                <h2>📦 Bulk Import Art (ZIP)</h2>
                <p>Upload a ZIP file of icons to automatically import them into a specific category.</p>
                <hr/>

                <?php settings_errors('cpd_settings_group'); ?>

                <form method="post" enctype="multipart/form-data" action="">
                    <?php wp_nonce_field('cpd_bulk_upload_action', 'cpd_bulk_upload_nonce'); ?>
                    <table class="form-table">
                        <tr valign="top">
                            <th scope="row">Target Category</th>
                            <td>
                                <select name="cpd_bulk_cat_id" required style="max-width: 300px; width: 100%;">
                                    <option value="">Select a Category...</option>
                                    <?php foreach ($categories as $cat): ?>
                                        <option value="<?php echo $cat->term_id; ?>"><?php echo esc_html($cat->name); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                        </tr>
                        <tr valign="top">
                            <th scope="row">ZIP File of Icons</th>
                            <td>
                                <input type="file" name="cpd_zip_file" accept=".zip" required />
                                <p class="description">SVG, PNG, or JPG files only. They will be imported into the selected category.</p>
                            </td>
                        </tr>
                    </table>
                    <p class="submit">
                        <input type="submit" name="cpd_bulk_upload_submit" class="button button-primary" value="Start Bulk Import" />
                    </p>
                </form>
            </div>
        </div>
        <?php
    }

    /**
     * Enqueue Admin Assets for Media Uploader
     */
    public function enqueue_admin_assets($hook)
    {
        if ('post.php' !== $hook && 'post-new.php' !== $hook) {
            return;
        }
        
        $post_type = get_post_type();
        if ('product' !== $post_type) {
            return;
        }

        wp_enqueue_media();
    }

    /**
     * Add Meta Box to WooCommerce Products
     */
    public function add_product_meta_box()
    {
        add_meta_box(
            'cpd_product_config',
            'Product Designer Configuration',
            array($this, 'render_product_config_meta_box'),
            'product',
            'normal',
            'high'
        );
    }

    /**
     * Render Product Config Meta Box
     */
    public function render_product_config_meta_box($post)
    {
        wp_nonce_field('cpd_product_config_nonce', 'cpd_product_config_nonce_field');

        // Fetch current values
        $mockups = get_post_meta($post->ID, '_cpd_v3_mockups', true);
        if (!$mockups || !is_array($mockups)) {
            $mockups = get_post_meta($post->ID, '_cpd_product_mockups', true); // Fallback to old key for migration
        }
        if (!is_array($mockups)) { $mockups = array(); }
        
        $colors  = get_post_meta($post->ID, '_cpd_product_colors', true) ?: '';
        $sizes   = get_post_meta($post->ID, '_cpd_product_sizes', true) ?: '';
        $override_cs = get_post_meta($post->ID, '_cpd_override_colors_sizes', true) === 'yes';
        $areas   = get_post_meta($post->ID, '_cpd_product_areas', true) ?: array();

        $views = array(
            'front' => 'Front View',
            'back'  => 'Back View',
            'rightSleeve' => 'Right View',
            'leftSleeve'  => 'Left View'
        );
        ?>
        <style>
            .cpd-meta-section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
            .cpd-meta-section:last-child { border-bottom: none; }
            .cpd-meta-title { font-weight: bold; margin-bottom: 10px; display: block; font-size: 14px; color: #1d2327; }
            .cpd-mockup-row { display: flex; flex-wrap: wrap; gap: 20px; }
            .cpd-mockup-item { width: 140px; text-align: center; background: #f8f9fa; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            .cpd-mockup-preview { width: 100%; height: 100px; background: #fff; border: 1px solid #ccc; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .cpd-mockup-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .cpd-area-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .cpd-area-table th, .cpd-area-table td { text-align: left; padding: 8px; border-bottom: 1px solid #f0f0f0; }
            .cpd-area-table input { width: 60px; }
        </style>

        <?php
        $view_labels = get_post_meta($post->ID, '_cpd_view_labels', true);
        if (!is_array($view_labels)) {
            $view_labels = array();
        }
        ?>
        <div class="cpd-meta-section">
            <span class="cpd-meta-title">1. Product Mockup Images & Labels</span>
            <p class="description">Upload high-resolution transparent PNG images for each view. You can also customize the label shown to users (e.g., "Top", "Bottom"). Leave image empty to hide the view.</p>
            <div class="cpd-mockup-row">
                <?php foreach ($views as $v_key => $v_label): 
                    $img_url = isset($mockups[$v_key]) ? $mockups[$v_key] : '';
                    $current_label = isset($view_labels[$v_key]) ? $view_labels[$v_key] : $v_label;
                ?>
                <div class="cpd-mockup-item">
                    <input type="text" name="cpd_view_labels[<?php echo $v_key; ?>]" value="<?php echo esc_attr($current_label); ?>" style="width: 100%; margin-bottom: 5px; font-size: 11px; text-align: center; border: 1px solid #ccc; padding: 2px;" placeholder="<?php echo esc_attr($v_label); ?>" />
                    <div class="cpd-mockup-preview" id="cpd_preview_<?php echo $v_key; ?>">
                        <?php if ($img_url): ?>
                            <img src="<?php echo esc_url($img_url); ?>" />
                        <?php else: ?>
                            <span style="color: #999; font-size: 10px;">No Image</span>
                        <?php endif; ?>
                    </div>
                    <input type="hidden" name="cpd_mockups[<?php echo $v_key; ?>]" id="cpd_input_<?php echo $v_key; ?>" value="<?php echo esc_attr($img_url); ?>" />
                    <button type="button" class="button cpd-upload-btn" data-view="<?php echo $v_key; ?>">Select</button>
                    <button type="button" class="button cpd-clear-btn" data-view="<?php echo $v_key; ?>" style="color: #d63638;">×</button>
                </div>
                <?php endforeach; ?>
            </div>
        </div>

        <div class="cpd-meta-section">
            <span class="cpd-meta-title">2. Custom Colors & Sizes</span>
            <div style="margin-bottom: 15px;">
                <label style="font-weight: bold; cursor: pointer;">
                    <input type="checkbox" name="cpd_override_colors_sizes" id="cpd-override-colors-sizes" value="yes" <?php checked($override_cs); ?> />
                    Override Global Colors & Sizes for this Product
                </label>
                <p class="description" style="margin-left: 24px; margin-top: 4px;">If unchecked, this product will use the global colors and sizes defined in the general settings.</p>
            </div>

            <div id="cpd-colors-sizes-wrap" style="<?php echo $override_cs ? 'display:block;' : 'display:none;'; ?>">
                <table class="form-table" style="margin-top: 0;">
                    <tr>
                        <th scope="row">Colors</th>
                        <td>
                            <div style="margin-bottom: 10px; display: inline-flex; gap: 10px; align-items: center; background: #f8f9fa; padding: 10px; border: 1px solid #c3c4c7; border-radius: 4px;">
                                <strong>Add Custom Color:</strong>
                                <input type="text" id="cpd-new-color-name" placeholder="e.g. Navy Blue" style="width: 150px;" />
                                <input type="color" id="cpd-new-color-hex" value="#000080" style="height: 30px; width: 40px; padding: 0; cursor: pointer; border: none; background: transparent;" />
                                <button type="button" class="button" id="cpd-add-color-btn">Add to List ↓</button>
                            </div>
                            <textarea name="cpd_product_colors" id="cpd_product_colors_textarea" rows="3" class="large-text" placeholder="Red:#ff0000, Blue:#0000ff"><?php echo esc_textarea($colors); ?></textarea>
                            <p class="description">Format: Name:Hex, separated by commas. You can use the helper above to generate the format.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Sizes</th>
                        <td>
                            <input type="text" name="cpd_product_sizes" value="<?php echo esc_attr($sizes); ?>" class="large-text" placeholder="S, M, L, XL" />
                            <p class="description">Separated by commas.</p>
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <?php
        // Normalize areas
        $normalized_areas = array();
        foreach ($views as $v_key => $v_label) {
            $normalized_areas[$v_key] = array();
            $raw = isset($areas[$v_key]) ? $areas[$v_key] : array();
            if (isset($raw['l'])) {
                $normalized_areas[$v_key][] = $raw;
            } else if (is_array($raw)) {
                foreach ($raw as $box) {
                    if (isset($box['l'])) $normalized_areas[$v_key][] = $box;
                }
            }
            if (empty($normalized_areas[$v_key])) {
                $normalized_areas[$v_key][] = array('l' => '150', 't' => '150', 'w' => '200', 'h' => '300');
            }
        }
        ?>
        <div class="cpd-meta-section">
            <span class="cpd-meta-title">3. Print Area Dimensions (Blue Dotted Box)</span>
            <p class="description">Set the coordinates in pixels (relative to 500x600 canvas). You can create multiple boxes per view.</p>
            
            <div style="margin-bottom: 15px;">
                <button type="button" class="button button-primary cpd-area-mode-btn" data-mode="manual">Manual Editing</button>
                <button type="button" class="button cpd-area-mode-btn" data-mode="visual">Visual Editing</button>
            </div>

            <div id="cpd-manual-editing-container"></div>
            <input type="hidden" name="cpd_areas_json" id="cpd_areas_json" value="<?php echo esc_attr(wp_json_encode($normalized_areas)); ?>" />
        </div>

        <?php
        $pricing_views = get_post_meta($post->ID, '_cpd_pricing_views', true) ?: array('front' => '', 'back' => '', 'leftSleeve' => '', 'rightSleeve' => '');
        $pricing_sizes = get_post_meta($post->ID, '_cpd_pricing_sizes', true) ?: array();
        $pricing_template = get_post_meta($post->ID, '_cpd_pricing_template', true) ?: '';
        ?>
        <div class="cpd-meta-section">
            <span class="cpd-meta-title">4. Advanced Pricing Rules (Optional)</span>
            <p class="description">Set specific upcharges for printing on different sides or ordering specific sizes.</p>

            <table class="form-table" style="margin-top: 10px;">
                <tr>
                    <th scope="row">Design View Upcharges ($)</th>
                    <td>
                        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                            <label>Front:<br/><input type="number" step="0.01" name="cpd_pricing_views[front]" value="<?php echo esc_attr($pricing_views['front'] ?? ''); ?>" style="width: 80px;" /></label>
                            <label>Back:<br/><input type="number" step="0.01" name="cpd_pricing_views[back]" value="<?php echo esc_attr($pricing_views['back'] ?? ''); ?>" style="width: 80px;" /></label>
                            <label>Left Sleeve:<br/><input type="number" step="0.01" name="cpd_pricing_views[leftSleeve]" value="<?php echo esc_attr($pricing_views['leftSleeve'] ?? ''); ?>" style="width: 80px;" /></label>
                            <label>Right Sleeve:<br/><input type="number" step="0.01" name="cpd_pricing_views[rightSleeve]" value="<?php echo esc_attr($pricing_views['rightSleeve'] ?? ''); ?>" style="width: 80px;" /></label>
                        </div>
                        <p class="description">Extra cost added if the user adds design to this specific side.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Size Upcharges ($)</th>
                    <td>
                        <div id="cpd-size-pricing-container"></div>
                        <input type="hidden" name="cpd_pricing_sizes_json" id="cpd_pricing_sizes_json" value="<?php echo esc_attr(wp_json_encode($pricing_sizes)); ?>" />
                    </td>
                </tr>
                <tr>
                    <th scope="row">Template Upcharge ($)</th>
                    <td>
                        <input type="number" step="0.01" name="cpd_pricing_template" value="<?php echo esc_attr($pricing_template); ?>" style="width: 100px;" />
                        <p class="description">Extra cost added to the base product price if the customer uses a pre-made design template.</p>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Visual Editor Modal -->
        <div id="cpd-visual-editor-modal" style="display:none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 99999;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 8px; display: flex; flex-direction: column; width: 95vw; height: 95vh; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <h3 style="margin:0; font-size: 18px;">Visual Print Area Editor <span style="font-size: 12px; color: #666; font-weight: normal; margin-left: 10px;">(Click and drag to draw a new square)</span></h3>
                    <button type="button" class="button button-primary cpd-close-visual-editor">Apply & Close</button>
                </div>
                <div style="display: flex; gap: 20px; flex: 1; min-height: 0; overflow: hidden;">
                    <!-- Thumbnails Sidebar -->
                    <div style="width: 140px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto;">
                        <?php foreach ($views as $v_key => $v_label): ?>
                        <div class="cpd-visual-thumb" data-view="<?php echo $v_key; ?>" style="cursor:pointer; border: 2px solid transparent; padding: 5px; text-align: center; border-radius: 4px; background: #f8f9fa;">
                            <span style="font-size: 12px; display: block; margin-bottom: 5px; font-weight: bold;"><?php echo $v_label; ?></span>
                            <div class="cpd-visual-thumb-img" id="cpd_visual_thumb_<?php echo $v_key; ?>" style="width: 100%; height: 90px; background: #eceff8; display:flex; align-items:center; justify-content:center; border: 1px solid #ccc; border-radius: 4px;">
                                <!-- Image will be loaded via JS -->
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <!-- Editor Area -->
                    <div style="flex: 1; background: #e0e0e0; display: flex; align-items: center; justify-content: center; overflow: auto; border: 1px solid #ccc; border-radius: 4px;">
                        <!-- Scaled Canvas Container -->
                        <div id="cpd-visual-canvas" style="width: 750px; height: 900px; background: #eceff8; position: relative; box-shadow: 0 4px 15px rgba(0,0,0,0.1); cursor: crosshair; user-select: none;">
                            <img id="cpd-visual-bg-img" src="" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
                            <div id="cpd-visual-boxes-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
        jQuery(document).ready(function($) {
            let state = JSON.parse($('#cpd_areas_json').val());
            const SCALE = 1.5; // Visual scale factor (750x900 instead of 500x600)

            const views = {
                front: 'Front View',
                back: 'Back View',
                rightSleeve: 'Right View',
                leftSleeve: 'Left View'
            };

            function renderManualTable() {
                let html = '<table class="cpd-area-table" style="width: 100%;"><thead><tr><th>View</th><th>Index</th><th>Left (L)</th><th>Top (T)</th><th>Width (W)</th><th>Height (H)</th><th></th></tr></thead><tbody>';
                for (const [view, label] of Object.entries(views)) {
                    const boxes = state[view] || [];
                    boxes.forEach((box, index) => {
                        html += `<tr>
                            <td><strong>${index === 0 ? label : ''}</strong></td>
                            <td>Box ${index + 1}</td>
                            <td><input type="number" value="${box.l}" class="cpd-manual-input" data-view="${view}" data-index="${index}" data-prop="l" style="width: 60px;"></td>
                            <td><input type="number" value="${box.t}" class="cpd-manual-input" data-view="${view}" data-index="${index}" data-prop="t" style="width: 60px;"></td>
                            <td><input type="number" value="${box.w}" class="cpd-manual-input" data-view="${view}" data-index="${index}" data-prop="w" style="width: 60px;"></td>
                            <td><input type="number" value="${box.h}" class="cpd-manual-input" data-view="${view}" data-index="${index}" data-prop="h" style="width: 60px;"></td>
                            <td><button type="button" class="button cpd-remove-box" data-view="${view}" data-index="${index}" style="color: #d63638;">Remove</button></td>
                        </tr>`;
                    });
                    html += `<tr>
                        <td colspan="7"><button type="button" class="button cpd-add-box" data-view="${view}">+ Add Box</button></td>
                    </tr>`;
                }
                html += '</tbody></table>';
                $('#cpd-manual-editing-container').html(html);
                $('#cpd_areas_json').val(JSON.stringify(state));
            }

            renderManualTable();

            $('#cpd-manual-editing-container').on('change', '.cpd-manual-input', function() {
                const view = $(this).data('view');
                const index = $(this).data('index');
                const prop = $(this).data('prop');
                state[view][index][prop] = $(this).val();
                $('#cpd_areas_json').val(JSON.stringify(state));
            });

            $('#cpd-manual-editing-container').on('click', '.cpd-add-box', function() {
                const view = $(this).data('view');
                state[view].push({l: 150, t: 150, w: 200, h: 300});
                renderManualTable();
            });

            $('#cpd-manual-editing-container').on('click', '.cpd-remove-box', function() {
                const view = $(this).data('view');
                const index = $(this).data('index');
                state[view].splice(index, 1);
                renderManualTable();
            });

            // Colors & Sizes Override Toggle
            $('#cpd-override-colors-sizes').change(function() {
                if ($(this).is(':checked')) {
                    $('#cpd-colors-sizes-wrap').slideDown();
                } else {
                    $('#cpd-colors-sizes-wrap').slideUp();
                }
            });

            // Custom Color Picker Helper
            $('#cpd-add-color-btn').click(function() {
                const name = $('#cpd-new-color-name').val().trim();
                const hex = $('#cpd-new-color-hex').val().trim();
                
                if (name && hex) {
                    let current = $('#cpd_product_colors_textarea').val().trim();
                    const entry = name + ':' + hex;
                    
                    if (current) {
                        // Remove trailing comma if exists
                        if (current.endsWith(',')) {
                            current += ' ' + entry;
                        } else {
                            current += ', ' + entry;
                        }
                    } else {
                        current = entry;
                    }
                    
                    $('#cpd_product_colors_textarea').val(current);
                    $('#cpd-new-color-name').val('');
                } else {
                    alert('Please enter a color name first.');
                    $('#cpd-new-color-name').focus();
                }
            });

            // Size Pricing Logic
            let sizePricingState = JSON.parse($('#cpd_pricing_sizes_json').val() || '[]');
            function renderSizePricingTable() {
                let html = '<table class="cpd-area-table" style="width: 100%; max-width: 400px; text-align: left;"><thead><tr><th style="padding-bottom:5px;">Size (e.g. XXL)</th><th style="padding-bottom:5px;">Upcharge ($)</th><th></th></tr></thead><tbody>';
                sizePricingState.forEach((rule, index) => {
                    html += `<tr>
                        <td><input type="text" value="${rule.size || ''}" class="cpd-size-price-input" data-index="${index}" data-prop="size" style="width: 100%;"></td>
                        <td><input type="number" step="0.01" value="${rule.price || ''}" class="cpd-size-price-input" data-index="${index}" data-prop="price" style="width: 100%;"></td>
                        <td><button type="button" class="button cpd-remove-size-price" data-index="${index}" style="color: #d63638;">Remove</button></td>
                    </tr>`;
                });
                html += `<tr><td colspan="3" style="padding-top:10px;"><button type="button" class="button cpd-add-size-price">+ Add Size Rule</button></td></tr></tbody></table>`;
                $('#cpd-size-pricing-container').html(html);
                $('#cpd_pricing_sizes_json').val(JSON.stringify(sizePricingState));
            }
            renderSizePricingTable();

            $('#cpd-size-pricing-container').on('input', '.cpd-size-price-input', function() {
                const index = $(this).data('index');
                const prop = $(this).data('prop');
                sizePricingState[index][prop] = $(this).val();
                $('#cpd_pricing_sizes_json').val(JSON.stringify(sizePricingState));
            });

            $('#cpd-size-pricing-container').on('click', '.cpd-add-size-price', function() {
                sizePricingState.push({size: '', price: ''});
                renderSizePricingTable();
            });

            $('#cpd-size-pricing-container').on('click', '.cpd-remove-size-price', function() {
                const index = $(this).data('index');
                sizePricingState.splice(index, 1);
                renderSizePricingTable();
            });

            // Media Uploader
            $('.cpd-upload-btn').click(function(e) {
                e.preventDefault();
                const btn = $(this);
                const view = btn.data('view');
                const frame = wp.media({
                    title: 'Select Mockup Image',
                    button: { text: 'Use Image' },
                    multiple: false
                });

                frame.on('select', function() {
                    const attachment = frame.state().get('selection').first().toJSON();
                    $(`#cpd_input_${view}`).val(attachment.url);
                    $(`#cpd_preview_${view}`).html(`<img src="${attachment.url}" />`);
                    $(`#cpd_visual_thumb_${view}`).html(`<img src="${attachment.url}" style="max-width:100%; max-height:100%; object-fit:contain;" />`);
                    if (activeVisualView === view) {
                        $('#cpd-visual-bg-img').attr('src', attachment.url).show();
                    }
                });

                frame.open();
            });

            $('.cpd-clear-btn').click(function() {
                const view = $(this).data('view');
                $(`#cpd_input_${view}`).val('');
                $(`#cpd_preview_${view}`).html('<span style="color: #999; font-size: 10px;">No Image</span>');
                $(`#cpd_visual_thumb_${view}`).html('<span style="color:#999;font-size:10px;">No Image</span>');
                if (activeVisualView === view) {
                    $('#cpd-visual-bg-img').hide();
                }
            });

            // Visual Editor Logic
            let activeVisualView = 'front';
            const visualCanvas = document.getElementById('cpd-visual-canvas');
            const boxesContainer = document.getElementById('cpd-visual-boxes-container');

            let actionState = {
                type: null, // 'draw', 'move', 'resize'
                index: -1,
                startX: 0,
                startY: 0,
                origL: 0,
                origT: 0,
                origW: 0,
                origH: 0
            };

            $('.cpd-area-mode-btn').click(function() {
                $('.cpd-area-mode-btn').removeClass('button-primary');
                $(this).addClass('button-primary');
                
                const mode = $(this).data('mode');
                if (mode === 'visual') {
                    $('#cpd-visual-editor-modal').show();
                    
                    $('.cpd-visual-thumb').each(function() {
                        const view = $(this).data('view');
                        const imgUrl = $(`#cpd_input_${view}`).val();
                        const thumbContainer = $(this).find('.cpd-visual-thumb-img');
                        if (imgUrl) {
                            thumbContainer.html(`<img src="${imgUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />`);
                        } else {
                            thumbContainer.html('<span style="color:#999;font-size:10px;">No Image</span>');
                        }
                    });
                    
                    loadVisualView(activeVisualView);
                } else {
                    renderManualTable(); // refresh manual view if it was hidden
                }
            });

            $('.cpd-close-visual-editor').click(function() {
                $('#cpd-visual-editor-modal').hide();
                $('.cpd-area-mode-btn').removeClass('button-primary');
                $('.cpd-area-mode-btn[data-mode="manual"]').addClass('button-primary');
                renderManualTable();
            });

            $('.cpd-visual-thumb').click(function() {
                activeVisualView = $(this).data('view');
                loadVisualView(activeVisualView);
            });

            function renderVisualBoxes() {
                boxesContainer.innerHTML = '';
                const boxes = state[activeVisualView] || [];
                boxes.forEach((box, index) => {
                    const el = document.createElement('div');
                    el.style.position = 'absolute';
                    el.style.border = '2px dashed rgba(67,97,238,0.9)';
                    el.style.background = 'rgba(67,97,238,0.2)';
                    el.style.boxSizing = 'border-box';
                    el.style.cursor = 'move';
                    el.style.left = (box.l * SCALE) + 'px';
                    el.style.top = (box.t * SCALE) + 'px';
                    el.style.width = (box.w * SCALE) + 'px';
                    el.style.height = (box.h * SCALE) + 'px';
                    el.dataset.index = index;

                    const deleteBtn = document.createElement('div');
                    deleteBtn.innerHTML = '×';
                    deleteBtn.style.position = 'absolute';
                    deleteBtn.style.top = '-12px';
                    deleteBtn.style.right = '-12px';
                    deleteBtn.style.background = '#d63638';
                    deleteBtn.style.color = '#fff';
                    deleteBtn.style.width = '24px';
                    deleteBtn.style.height = '24px';
                    deleteBtn.style.borderRadius = '50%';
                    deleteBtn.style.textAlign = 'center';
                    deleteBtn.style.lineHeight = '24px';
                    deleteBtn.style.cursor = 'pointer';
                    deleteBtn.style.fontWeight = 'bold';
                    deleteBtn.style.zIndex = 15;
                    deleteBtn.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        state[activeVisualView].splice(index, 1);
                        $('#cpd_areas_json').val(JSON.stringify(state));
                        renderVisualBoxes();
                    });

                    const handle = document.createElement('div');
                    handle.style.position = 'absolute';
                    handle.style.width = '14px';
                    handle.style.height = '14px';
                    handle.style.background = '#4361ee';
                    handle.style.right = '-7px';
                    handle.style.bottom = '-7px';
                    handle.style.cursor = 'se-resize';
                    handle.style.borderRadius = '50%';
                    handle.style.zIndex = 10;
                    handle.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        actionState = {
                            type: 'resize',
                            index: index,
                            startX: e.clientX,
                            startY: e.clientY,
                            origW: parseFloat(box.w),
                            origH: parseFloat(box.h)
                        };
                    });

                    el.addEventListener('mousedown', (e) => {
                        if (actionState.type === 'resize') return;
                        e.stopPropagation();
                        actionState = {
                            type: 'move',
                            index: index,
                            startX: e.clientX,
                            startY: e.clientY,
                            origL: parseFloat(box.l),
                            origT: parseFloat(box.t)
                        };
                    });

                    el.appendChild(deleteBtn);
                    el.appendChild(handle);
                    boxesContainer.appendChild(el);
                });
            }

            function loadVisualView(view) {
                $('.cpd-visual-thumb').css('border-color', 'transparent');
                $(`.cpd-visual-thumb[data-view="${view}"]`).css('border-color', '#2271b1');
                
                const imgUrl = $(`#cpd_input_${view}`).val();
                if (imgUrl) {
                    $('#cpd-visual-bg-img').attr('src', imgUrl).show();
                } else {
                    $('#cpd-visual-bg-img').hide();
                }

                if (!state[view]) state[view] = [];
                renderVisualBoxes();
            }

            visualCanvas.addEventListener('mousedown', function(e) {
                if (e.target.closest('#cpd-visual-boxes-container > div')) return; // handled by box
                const rect = visualCanvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / SCALE;
                const y = (e.clientY - rect.top) / SCALE;
                
                state[activeVisualView].push({l: Math.round(x), t: Math.round(y), w: 0, h: 0});
                const newIndex = state[activeVisualView].length - 1;

                actionState = {
                    type: 'draw',
                    index: newIndex,
                    startX: x,
                    startY: y
                };
                renderVisualBoxes();
            });

            document.addEventListener('mousemove', function(e) {
                if (!actionState.type) return;

                const box = state[activeVisualView][actionState.index];
                if (!box) return;

                if (actionState.type === 'draw') {
                    const rect = visualCanvas.getBoundingClientRect();
                    let currentX = (e.clientX - rect.left) / SCALE;
                    let currentY = (e.clientY - rect.top) / SCALE;

                    // Constrain
                    if (currentX < 0) currentX = 0;
                    if (currentY < 0) currentY = 0;
                    if (currentX > 500) currentX = 500;
                    if (currentY > 600) currentY = 600;

                    const newL = Math.min(actionState.startX, currentX);
                    const newT = Math.min(actionState.startY, currentY);
                    const newW = Math.abs(currentX - actionState.startX);
                    const newH = Math.abs(currentY - actionState.startY);

                    box.l = Math.round(newL);
                    box.t = Math.round(newT);
                    box.w = Math.round(newW);
                    box.h = Math.round(newH);
                } else if (actionState.type === 'move') {
                    const dx = (e.clientX - actionState.startX) / SCALE;
                    const dy = (e.clientY - actionState.startY) / SCALE;
                    
                    let newL = actionState.origL + dx;
                    let newT = actionState.origT + dy;
                    
                    if (newL < 0) newL = 0;
                    if (newT < 0) newT = 0;
                    if (newL + box.w > 500) newL = 500 - box.w;
                    if (newT + box.h > 600) newT = 600 - box.h;

                    box.l = Math.round(newL);
                    box.t = Math.round(newT);
                } else if (actionState.type === 'resize') {
                    const dx = (e.clientX - actionState.startX) / SCALE;
                    const dy = (e.clientY - actionState.startY) / SCALE;
                    
                    let newW = actionState.origW + dx;
                    let newH = actionState.origH + dy;
                    
                    if (newW < 10) newW = 10;
                    if (newH < 10) newH = 10;

                    if (box.l + newW > 500) newW = 500 - box.l;
                    if (box.t + newH > 600) newH = 600 - box.t;

                    box.w = Math.round(newW);
                    box.h = Math.round(newH);
                }

                $('#cpd_areas_json').val(JSON.stringify(state));
                renderVisualBoxes();
            });

            document.addEventListener('mouseup', function() {
                if (actionState.type === 'draw') {
                    // if drawn box is too small, remove it
                    const box = state[activeVisualView][actionState.index];
                    if (box && (box.w < 10 || box.h < 10)) {
                        state[activeVisualView].splice(actionState.index, 1);
                        $('#cpd_areas_json').val(JSON.stringify(state));
                        renderVisualBoxes();
                    }
                }
                actionState.type = null;
            });
        });
        </script>
        <?php
    }

    /**
     * Save Product Config Meta Box
     */
    public function save_product_config($post_id)
    {
        if (!isset($_POST['cpd_product_config_nonce_field']) || !wp_verify_nonce($_POST['cpd_product_config_nonce_field'], 'cpd_product_config_nonce')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        // Save Mockups - Using v3 key for clean data
        if (isset($_POST['cpd_mockups']) && is_array($_POST['cpd_mockups'])) {
            $mockups = array();
            foreach ($_POST['cpd_mockups'] as $v_key => $url) {
                if (!empty($url)) {
                    $mockups[$v_key] = esc_url_raw($url);
                }
            }
            update_post_meta($post_id, '_cpd_v3_mockups', $mockups);
        }

        if (isset($_POST['cpd_view_labels']) && is_array($_POST['cpd_view_labels'])) {
            $view_labels = array();
            foreach ($_POST['cpd_view_labels'] as $v_key => $label) {
                $view_labels[$v_key] = sanitize_text_field($label);
            }
            update_post_meta($post_id, '_cpd_view_labels', $view_labels);
        }

        // Save Pricing Rules
        if (isset($_POST['cpd_pricing_views'])) {
            $sanitized_views = array();
            foreach ($_POST['cpd_pricing_views'] as $key => $val) {
                $sanitized_views[$key] = sanitize_text_field($val);
            }
            update_post_meta($post_id, '_cpd_pricing_views', $sanitized_views);
        }
        if (isset($_POST['cpd_pricing_sizes_json'])) {
            $sizes_arr = json_decode(stripslashes($_POST['cpd_pricing_sizes_json']), true);
            $clean_sizes = array();
            if (is_array($sizes_arr)) {
                foreach ($sizes_arr as $rule) {
                    if (!empty($rule['size'])) {
                        $clean_sizes[] = array(
                            'size' => sanitize_text_field($rule['size']),
                            'price' => sanitize_text_field($rule['price'])
                        );
                    }
                }
            }
            update_post_meta($post_id, '_cpd_pricing_sizes', $clean_sizes);
        }
        if (isset($_POST['cpd_pricing_template'])) {
            update_post_meta($post_id, '_cpd_pricing_template', sanitize_text_field($_POST['cpd_pricing_template']));
        }

        // Save Colors & Sizes
        if (isset($_POST['cpd_override_colors_sizes'])) {
            update_post_meta($post_id, '_cpd_override_colors_sizes', 'yes');
        } else {
            update_post_meta($post_id, '_cpd_override_colors_sizes', 'no');
        }

        if (isset($_POST['cpd_product_colors'])) {
            update_post_meta($post_id, '_cpd_product_colors', sanitize_text_field($_POST['cpd_product_colors']));
        }
        if (isset($_POST['cpd_product_sizes'])) {
            update_post_meta($post_id, '_cpd_product_sizes', sanitize_text_field($_POST['cpd_product_sizes']));
        }

        // Save Print Areas
        if (isset($_POST['cpd_areas_json'])) {
            $areas_data = json_decode(stripslashes($_POST['cpd_areas_json']), true);
            if (is_array($areas_data)) {
                $sanitized = array();
                foreach ($areas_data as $v_key => $boxes) {
                    $sanitized[$v_key] = array();
                    foreach ($boxes as $box) {
                        $sanitized[$v_key][] = array_map('sanitize_text_field', $box);
                    }
                }
                update_post_meta($post_id, '_cpd_product_areas', $sanitized);
            }
        }
    }
}
