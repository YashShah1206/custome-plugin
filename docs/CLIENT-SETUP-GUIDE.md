# Custom Product Designer Plugin

## Client Setup and Operations Guide

This document explains how to install, configure, migrate, and maintain the **Custom Product Designer** plugin on a WordPress + WooCommerce project.

Use this guide when:

- installing the plugin on a new project
- moving the plugin to another client website
- setting up products and designer views
- managing uploaded images and order data

---

## 1. What This Plugin Does

The plugin allows customers to:

- customize products such as t-shirts, hoodies, jackets, and caps
- add text, artwork, names, and numbers
- upload their own images
- preview multiple design views
- add the customized product to WooCommerce cart
- place an order with design information attached to the order

The plugin includes:

- a WordPress plugin backend
- WooCommerce integration
- a React-based designer frontend bundled inside the plugin

---

## 2. Minimum Requirements

Before installation, confirm the website has:

- WordPress installed
- WooCommerce installed and active
- permission to upload files into `wp-content/uploads`
- a product catalog already created in WooCommerce

Recommended:

- staging site for testing before live launch
- admin access to WordPress
- backup access to both files and database

---

## 3. Plugin Package Contents

This plugin project contains:

- main plugin file
- PHP backend files
- bundled React frontend build
- static product mockup/model assets used by the designer

Important note:

- The plugin folder contains the application code
- Customer-generated images are **not** stored permanently inside the plugin folder
- Customer-generated images are stored in WordPress uploads folders

---

## 4. Where Data Is Stored

This is the most important part to understand before moving the plugin between projects.

### 4.1 Plugin Code

The plugin code is stored in:

`/wp-content/plugins/custom-product-designer/`

This includes:

- PHP plugin code
- React build files
- bundled assets included with the plugin

### 4.2 Uploaded Customer Files

The plugin creates and uses these WordPress upload folders:

- `wp-content/uploads/cpd-designs/`
- `wp-content/uploads/cpd-temp/`

Purpose:

- `cpd-designs` stores generated design output images
- `cpd-temp` stores uploaded customer image assets used during customization

### 4.3 Database Storage

Each WordPress website uses **its own database**.

This means:

- one client site has its own plugin data
- another client site has separate plugin data
- data is not automatically shared between sites

The plugin stores data in the WordPress database such as:

- plugin options/settings
- product-level configuration
- WooCommerce cart/order meta
- design metadata such as JSON and image URLs

Important:

- the database mainly stores references, settings, and metadata
- the real generated images remain as files in `wp-content/uploads/...`
- if uploads are not copied during migration, old image references can break

---

## 5. Fresh Installation on a New WordPress Project

Follow these steps for a completely new client website.

### Step 1. Prepare the plugin package

Make sure you have the full plugin folder ready.

It should include:

- the main plugin file
- the `includes` folder
- the `build` folder

If the `build` folder is missing, the React designer frontend will not load correctly.

### Step 2. Upload the plugin

Upload the plugin folder into:

`/wp-content/plugins/`

Example:

`/wp-content/plugins/custom-product-designer/`

### Step 3. Activate the plugin

In WordPress admin:

1. Go to `Plugins`
2. Find `Custom Product Designer`
3. Click `Activate`

On activation, the plugin will create its working upload directories automatically inside WordPress uploads if permissions are available.

### Step 4. Confirm WooCommerce is active

The plugin depends on WooCommerce.

Before continuing, confirm:

- WooCommerce plugin is activated
- products exist
- cart and checkout pages are configured

### Step 5. Create or choose designer products

Create the WooCommerce products you want customers to customize.

Examples:

- t-shirt
- cap
- hoodie
- jacket

### Step 6. Add the designer page

Create a page in WordPress and add this shortcode:

`[product_designer]`

If needed, you can pass a product directly:

`[product_designer product_id="123"]`

### Step 7. Open plugin settings

In WordPress admin, go to the plugin’s menu area and configure:

- global settings
- category settings
- artwork library
- product-specific settings

### Step 8. Test the complete flow

Before launch, test:

1. open designer
2. choose product
3. upload image
4. add text/artwork
5. save and add to cart
6. view cart details
7. complete checkout
8. open the order in admin and confirm design data is present

---

## 6. Global Admin Settings

The plugin provides central settings in the WordPress admin.

These should be configured before assigning products to customers.

### 6.1 Settings Page

Use the plugin settings page to control:

- default art visibility
- module availability
- image cleanup period

Main options:

#### Show Default Art Library

Controls whether built-in art options appear in the designer.

#### Enable T-Shirt Module

Used to manage t-shirt-related configuration in admin.

#### Enable Cap Module

Used to manage cap-related configuration in admin.

#### Auto-Delete Design Images After X Days

Controls automatic cleanup of old generated files.

Recommended values:

- `0` = never delete automatically
- large retention period if historical orders need image records

Important:

- If you delete files too early, old order image links may no longer work

---

## 7. Product Design Settings

The plugin includes product design settings for category-level defaults.

### 7.1 T-Shirt Configuration

You can define:

- available colors
- available sizes
- print areas for front/back/sleeve views

Color format:

`Red:#ff0000, Blue:#0000ff, Black:#000000`

Size format:

`S, M, L, XL, XXL`

### 7.2 Cap Configuration

You can define:

- cap colors
- cap sizes
- cap print areas

### 7.3 Print Areas

Print areas define where users can place artwork/text on each product view.

These are configured using:

- `L` = left
- `T` = top
- `W` = width
- `H` = height

The plugin also supports visual editing for print areas in product configuration.

---

## 8. Product-Specific Configuration

Each WooCommerce product can have its own designer setup.

Open a product in WordPress admin and locate:

`Product Designer Configuration`

From there, configure the following.

### 8.1 Product Mockup Images

Upload mockup images for each view:

- front
- back
- right sleeve / right view
- left sleeve / left view

Best practice:

- use clear PNG mockups
- use consistent dimensions
- use transparent background where possible

If a view image is left empty, that view can be effectively hidden from the customer interface.

### 8.2 View Labels

You can rename view labels shown to the customer.

Example:

- Front View -> Front
- Back View -> Back
- Right Sleeve -> Right Side
- Left Sleeve -> Left Side

### 8.3 Product-Level Colors and Sizes

You can override global colors and sizes for a specific product.

Use this when:

- one t-shirt has different colors from another
- some products should have only selected sizes

### 8.4 Product Print Areas

You can define product-level print boxes for each view.

This is useful when:

- different products have different printable areas
- cap, hoodie, or jacket layouts need separate design zones

### 8.5 Advanced Pricing Rules

Optional pricing controls include:

- extra cost per design side
- extra cost per size
- extra charge for template usage

Examples:

- Back print: +5
- XXL size: +2
- Template use: +3

---

## 9. Art Library Management

The plugin includes an Art Library area in admin.

Use it to:

- add single artwork items
- create artwork categories
- bulk import artwork via ZIP file

### 9.1 Add Single Artwork

Go to the art library and upload:

- PNG
- JPG
- GIF
- SVG

### 9.2 Create Categories

Examples:

- Sports
- Emojis
- Logos
- Symbols
- Festival Graphics

### 9.3 Bulk Import ZIP

You can upload a ZIP file and assign all its images to a selected art category.

Recommended before bulk import:

1. create the target category first
2. confirm image names are clean and meaningful
3. test with a small ZIP before importing a large one

---

## 10. Customer Uploads and Generated Images

This section answers the most common migration question.

### 10.1 Do uploaded image folders come automatically when plugin is copied?

No.

If you copy only the plugin folder to another project:

- plugin code will move
- uploaded customer files will **not** move automatically
- old order-linked images will **not** move automatically

### 10.2 Are images stored in the database?

Not as full file binaries in the current plugin flow.

Instead:

- image files are stored physically in WordPress uploads folders
- the database stores file URLs and related metadata

### 10.3 Why this matters

If you migrate the plugin without copying uploads:

- old design previews may break
- old uploaded customer images may not open
- order records may still exist, but their linked files may be missing

---

## 11. Moving the Plugin to Another Project

There are two common scenarios.

### Scenario A. Install plugin only, no old history needed

Use this when:

- new client
- fresh store
- no need to keep previous orders/designs

Steps:

1. Copy/upload the plugin folder to the new WordPress site
2. Activate the plugin
3. Configure settings again
4. Recreate products or apply settings to new products
5. Upload mockups and artwork again if needed
6. Test the full customer flow

This gives you a fresh setup.

### Scenario B. Full migration with old data and images

Use this when:

- same business is moving to a new server/domain
- you need existing settings, product setup, and order-linked design files

You must migrate all of the following:

1. Plugin folder
2. WordPress database
3. WordPress uploads folders including:
   - `wp-content/uploads/cpd-designs/`
   - `wp-content/uploads/cpd-temp/`
4. Any Media Library assets used for mockups/artwork

If any of these are missing, the migrated site may be incomplete.

---

## 12. Full Migration Checklist

Use this checklist when moving an existing installation.

### Files to move

- plugin folder
- `wp-content/uploads/cpd-designs/`
- `wp-content/uploads/cpd-temp/`
- normal WordPress media uploads if they are used as mockups or art library images

### Database content to move

- WordPress options
- WooCommerce products
- product meta
- order meta
- plugin settings
- art library posts and taxonomy data

### After migration

1. Open plugin settings and verify saved values
2. Open a few products and confirm mockup URLs work
3. Open old orders and check image previews
4. Test new upload and new order creation
5. If domain changed, verify image URLs are correct

---

## 13. Recommended Deployment Process

For any client installation, use this deployment sequence.

### Phase 1. Staging

1. Install plugin on staging
2. Configure settings
3. Add mockups and artwork
4. Test products
5. Place sample orders

### Phase 2. Client Review

1. Let client check colors, sizes, pricing, and print areas
2. Confirm designer views and labels
3. Confirm cart and checkout output

### Phase 3. Production Launch

1. Backup live files and database
2. Deploy plugin
3. Migrate settings/assets if needed
4. Test one complete live order

---

## 14. How to Change Common Settings

### Change available colors

Go to:

- plugin product design settings for global defaults
- or product edit screen for product-specific overrides

Update the colors in this format:

`Color Name:#hexcode`

### Change available sizes

Enter comma-separated values:

`S, M, L, XL`

### Change printable area

Open the product configuration and:

- use manual box coordinates
- or use visual editing mode

### Change product mockups

Open the product, then replace the mockup image for each view.

### Change art library items

Go to art dashboard and:

- add new art
- edit old art
- remove unwanted art
- manage categories

### Change pricing rules

Open the product and update:

- view-based extra charges
- size-based extra charges
- template extra charge

---

## 15. Backup Recommendations

Always back up both:

- database
- files

Minimum backup locations relevant to this plugin:

- plugin folder
- uploads folder
- WooCommerce database content

Without both file and database backup, a full restoration may not be possible.

---

## 16. Troubleshooting

### Problem: Designer page loads blank

Check:

- plugin is active
- WooCommerce is active
- plugin `build` folder exists
- shortcode page is created correctly

### Problem: Images are not saving

Check:

- website can write to `wp-content/uploads`
- user permissions and login flow
- server file permissions

### Problem: Old order images are missing after migration

Check:

- `cpd-designs` folder was copied
- `cpd-temp` folder was copied
- database migrated successfully
- URLs were updated if domain changed

### Problem: Product views do not look correct

Check:

- product mockup images
- view labels
- print area positions
- category/product color-size settings

---

## 17. Handover Notes for Client

Please make sure the client understands:

1. The plugin code and the uploaded design files are not the same thing.
2. Copying only the plugin folder is not enough for a full migration.
3. This plugin depends on WooCommerce and WordPress uploads working correctly.
4. Historical design images can break if uploads are removed or not migrated.
5. All major changes should be tested on staging first.

---

## 18. Recommended Acceptance Test

Before final signoff, the client should confirm the following:

1. Open designer successfully
2. Select product and color
3. Add text
4. Upload image
5. Add artwork
6. Set sizes and quantity
7. Add to cart
8. Complete checkout
9. Open order in admin
10. Confirm design previews and metadata are visible

---

## 19. Summary

For a fresh installation, you can install the plugin like a normal WordPress plugin.

For a full migration, you must move:

- plugin files
- uploads folders
- database content

If you only copy the plugin folder, the plugin code will work, but old uploaded images, old design references, and old configuration data will not automatically come with it.
