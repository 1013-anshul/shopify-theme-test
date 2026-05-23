/**
 * Antigravity Custom Theme Engine
 * Contains global namespace, AJAX Cart, Sticky Header, and Product Interactions
 */

(function () {
  'use strict';

  // Global theme helpers
  window.theme = window.theme || {};

  // Money formatter helper
  window.theme.formatMoney = function (cents, format) {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || window.theme.moneyFormat || '$ {\{ amount \}\}';

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = precision || 2;
      thousands = thousands || ',';
      decimal = decimal || '.';

      if (isNaN(number) || number == null) {
        return 0;
      }

      number = (number / 100.0).toFixed(precision);

      var parts = number.split('.'),
        dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
        centsStr = parts[1] ? decimal + parts[1] : '';

      return dollars + centsStr;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
    }

    return formatString.replace(placeholderRegex, value);
  };

  // 1. AJAX Cart Drawer Module
  var CartDrawer = {
    init: function () {
      this.drawer = document.getElementById('CartDrawer');
      this.itemsContainer = document.getElementById('CartDrawerItems');
      this.subtotalContainer = document.getElementById('CartDrawerSubtotal');
      this.badges = document.querySelectorAll('.cart-count-badge');
      
      this.bindEvents();
      this.refresh();
    },

    bindEvents: function () {
      var self = this;

      // Listen for add-to-cart form submissions
      document.addEventListener('submit', function (e) {
        var form = e.target;
        if (form.action && form.action.includes('/cart/add')) {
          e.preventDefault();
          self.addItemFromForm(form);
        }
      });
    },

    open: function () {
      if (this.drawer) {
        this.drawer.classList.add('active');
        this.drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Lock background scroll
      }
    },

    close: function () {
      if (this.drawer) {
        this.drawer.classList.remove('active');
        this.drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    },

    refresh: function () {
      var self = this;
      fetch('/cart.js')
        .then(function (res) { return res.json(); })
        .then(function (cart) {
          self.render(cart);
        })
        .catch(function (err) {
          console.error('Error fetching cart:', err);
        });
    },

    addItemFromForm: function (form) {
      var self = this;
      var formData = new FormData(form);

      // Find the add-to-cart button
      var submitButton = form.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add('button-disabled');
        var originalText = submitButton.textContent;
        submitButton.textContent = 'Adding...';
      }

      fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      })
        .then(function (res) { return res.json(); })
        .then(function (item) {
          self.refresh();
          self.open();
        })
        .catch(function (err) {
          console.error('Error adding item:', err);
        })
        .finally(function () {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove('button-disabled');
            submitButton.textContent = originalText;
          }
        });
    },

    updateQuantity: function (line, quantity) {
      var self = this;
      fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: line, quantity: quantity })
      })
        .then(function (res) { return res.json(); })
        .then(function (cart) {
          self.render(cart);
        })
        .catch(function (err) {
          console.error('Error updating quantity:', err);
        });
    },

    render: function (cart) {
      var self = this;

      // Update badges
      this.badges.forEach(function (badge) {
        badge.textContent = cart.item_count;
        badge.style.display = cart.item_count > 0 ? 'flex' : 'none';
      });

      // Update Subtotal
      if (this.subtotalContainer) {
        this.subtotalContainer.textContent = window.theme.formatMoney(cart.total_price);
      }

      if (!this.itemsContainer) return;

      if (cart.item_count === 0) {
        this.itemsContainer.innerHTML = `
          <div class="cart-drawer-empty">
            <p class="cart-drawer-empty-text">Your cart is empty</p>
            <button class="button button-primary" onclick="window.theme.CartDrawer.close()">Continue Shopping</button>
          </div>
        `;
        return;
      }

      var html = '';
      cart.items.forEach(function (item, index) {
        var lineIndex = index + 1;
        var imageUrl = item.image ? item.image : 'https://cdn.shopify.com/s/images/themes/product-dummy.png';
        var variantTitle = item.variant_title ? item.variant_title : '';

        html += `
          <div class="cart-drawer-item">
            <img src="${imageUrl}" alt="${item.product_title}" class="cart-drawer-item-img">
            <div class="cart-drawer-item-details">
              <h3 class="cart-drawer-item-title">${item.product_title}</h3>
              ${variantTitle ? `<p class="cart-drawer-item-variant">${variantTitle}</p>` : ''}
              <p class="cart-drawer-item-price">${window.theme.formatMoney(item.final_line_price)}</p>
              
              <div class="cart-drawer-item-actions">
                <div class="quantity-selector">
                  <button type="button" class="quantity-btn" onclick="window.theme.CartDrawer.updateQuantity(${lineIndex}, ${item.quantity - 1})">-</button>
                  <input type="text" class="quantity-input" value="${item.quantity}" readonly>
                  <button type="button" class="quantity-btn" onclick="window.theme.CartDrawer.updateQuantity(${lineIndex}, ${item.quantity + 1})">+</button>
                </div>
                <button type="button" class="cart-drawer-item-remove" onclick="window.theme.CartDrawer.updateQuantity(${lineIndex}, 0)">Remove</button>
              </div>
            </div>
          </div>
        `;
      });

      this.itemsContainer.innerHTML = html;
    }
  };

  // 2. Product Gallery Swapper
  var ProductGallery = {
    init: function () {
      var self = this;
      var mainImage = document.getElementById('MainProductImage');
      var thumbnails = document.querySelectorAll('.product-thumbnail');

      if (!mainImage || thumbnails.length === 0) return;

      thumbnails.forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          // Remove active class from all
          thumbnails.forEach(function (t) { t.classList.remove('active'); });
          
          // Add active class to clicked thumbnail
          thumb.classList.add('active');

          // Swap image source
          var newSrc = thumb.getAttribute('data-image-src');
          if (newSrc) {
            mainImage.src = newSrc;
          }
        });
      });
    }
  };

  // 3. UI Accordions
  var Accordions = {
    init: function () {
      var items = document.querySelectorAll('.accordion-item');
      if (items.length === 0) return;

      items.forEach(function (item) {
        var titleButton = item.querySelector('.accordion-title');
        if (!titleButton) return;

        titleButton.addEventListener('click', function () {
          var isActive = item.classList.contains('active');
          
          // Close all adjacent items optionally
          items.forEach(function (i) { i.classList.remove('active'); });

          if (!isActive) {
            item.classList.add('active');
          }
        });
      });
    }
  };

  // 4. Mobile Menu Navigation toggle
  var MobileMenu = {
    init: function () {
      var burger = document.querySelector('.mobile-menu-toggle');
      var nav = document.querySelector('.nav-links');

      if (burger && nav) {
        burger.addEventListener('click', function () {
          nav.classList.toggle('mobile-active');
          burger.classList.toggle('burger-active');
        });
      }
    }
  };

  // Expose Cart Drawer globally so html buttons can trigger it
  window.theme.CartDrawer = CartDrawer;

  // Run modules on DOM loaded
  document.addEventListener('DOMContentLoaded', function () {
    CartDrawer.init();
    ProductGallery.init();
    Accordions.init();
    MobileMenu.init();
  });

})();
