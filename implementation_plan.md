# Feature Upgrade: Size & Quantity Matrix + Cart/Admin Metadata Extensions

This plan details the implementation of full order-matrix capturing (sizes + quantities), deep metadata extraction (fonts, art details), robust WooCommerce cart visualization (showing all 4 views), and an upgraded WordPress Admin dashboard.

## Overview of Changes

1. **Bug Fix: Image Paths Returning HTML**
   * **Problem**: Currently downloading an image in the admin panel downloads a `.html` dashboard page instead of a `.png`, and image thumbnails are broken. This happens because WordPress `wp_json_encode` escapes forward slashes (`/` to `\/`), which some environments fail to `json_decode` back cleanly, resulting in a malformed URL that WordPress redirects to a 404 (the dashboard).
   * **Solution**: Ensure URLs are saved robustly without escaped slashes via `wp_json_encode($data, JSON_UNESCAPED_SLASHES)` and double-check permalink structures in `class-cpd-rest-api.php`.

2. **React App: Size & Quantity Selector**
   * **UI Addition**: I will introduce a new section (`SizesPanel`) in the Designer Sidebar (or below the color picker) strictly for defining sizes per garment.
   * **Functionality**: Users will see a matrix of sizes (`S`, `M`, `L`, `XL`, `2XL`, etc.) and can input the exact quantity desired for each.
   * **State**: This matrix will be maintained in a `sizesQuantities` state dictionary (e.g. `{ 'S': 2, 'XL': 12 }`) and passed to `BottomBar.jsx`.

3. **REST API Data Injection**
   * The `BottomBar` will take the `sizesQuantities`, calculate the **Grand Total Quantity**, and sum up the price.
   * It will pass this deep data structure (including `sizes`, `font` strings used on canvas, `art` assets used, `name/numbers`) via the `/save-image` endpoint.

4. **WooCommerce Cart & Checkout Enhancements**
   * **Current State**: Cart only shows a single "View Layout" link and a Color.
   * **New State**: Will parse the multi-view JSON and extract all 4 URLs to display inline thumbnails in the cart and checkout summary!
   * Will list the selected Sizes/Quantities matrix explicitly as a line item property (e.g., `Sizes: S: 2, XL: 12`).
   * Add text/font details to the Cart.

5. **WordPress Admin Dashboard Upgrade**
   * Rewrite the HTML for the `cpd_admin_page()`.
   * Specifically break out a detailed list for each saved design containing:
     * High-res multi-view grid (Front, Back, L-Sleeve, R-Sleeve).
     * Color swatch.
     * Exact quantity matrix (`S x2`, `XL x12`).
     * Print Details: Extracted Text logic (which items, which fonts, colors).

---

## Technical File Modifications

### 1. `frontend/src/App.jsx`
* Establish `sizesQuantities` Context state: `const [sizes, setSizes] = useState({})`.
* Ensure `BottomBar` aggregates the quantities before talking to WooCommerce.

### 2. `frontend/src/components/Sidebar.jsx`
* Attach the new UI for Quantity picking tied to the active product type.

### 3. `frontend/src/components/BottomBar.jsx`
* Update payload to `save-image` and `wcAddToCartUrl` body with `sizes_quantities` data map and calculated total quantities. Note: if total quantity = 14, we tell WooCommerce the cart item is QTY: 1, but its metadata signifies it represents a specialized bundle order of 14, OR we set WooCommerce QTY to 14. We will set WooCommerce Cart Item QTY to the total sum of the pieces so the base price multiplier works identically.

### 4. `includes/class-cpd-database.php`
* Add column `sizes_quantities` (LONGTEXT) to `cpd_designs` table.
* *(Note: We will invoke an `ALTER TABLE` manually in PHP so you won't have to rebuild the DB).*

### 5. `includes/class-cpd-rest-api.php`
* Intercept `sizes_quantities`, format JSON correctly to fix the broken image URL strings.

### 6. `includes/class-cpd-woocommerce.php`
* Upgrade `get_item_data()` to output a 4-image HTML strip instead of a single link.
* Upgrade `get_item_data()` to output `Size Profile: S(2), XL(12)`.

## User Review Required
Please review this implementation plan. If giving the go-ahead, I will orchestrate all React and PHP architectural extensions together.
