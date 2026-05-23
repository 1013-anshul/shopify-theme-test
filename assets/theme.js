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
    var formatString = format || window.theme.moneyFormat || '$ {{ amount }}';

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
      // Support both cart-pip and CartCount selectors
      this.badges = document.querySelectorAll('.cart-pip, #CartCount');
      
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

  // 2. Product Gallery Swapper (Section aware)
  var ProductGallery = {
    init: function () {
      var self = this;
      var gallerySections = document.querySelectorAll('.pdp-section, .featured-product-section');
      
      gallerySections.forEach(function (section) {
        var mainImage = section.querySelector('.pdp-main-image');
        var thumbnails = section.querySelectorAll('.product-thumbnail');

        if (!mainImage || thumbnails.length === 0) return;

        thumbnails.forEach(function (thumb) {
          thumb.addEventListener('click', function () {
            thumbnails.forEach(function (t) { t.classList.remove('active'); });
            thumb.classList.add('active');

            var newSrc = thumb.getAttribute('data-image-src');
            if (newSrc && mainImage.src !== newSrc) {
              mainImage.style.opacity = '0.3';
              mainImage.style.transition = 'opacity 0.15s ease-out';
              setTimeout(function () {
                mainImage.src = newSrc;
                mainImage.style.opacity = '1';
              }, 150);
            }
          });
        });
      });
    }
  };

  // 3. UI Tabs
  var PdpTabs = {
    init: function () {
      var tabContainers = document.querySelectorAll('.pdp-tabs');
      tabContainers.forEach(function (container) {
        var tabs = container.querySelectorAll('.pdp-tab');
        tabs.forEach(function (tab) {
          tab.addEventListener('click', function () {
            tabs.forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');

            var targetTabName = tab.getAttribute('data-tab');
            var infoColumn = container.closest('.pdp-info-column');
            if (infoColumn) {
              var tabBodies = infoColumn.querySelectorAll('.pdp-tab-body');
              tabBodies.forEach(function (body) {
                if (body.id === 'pdp-tab-' + targetTabName) {
                  body.style.display = 'block';
                } else {
                  body.style.display = 'none';
                }
              });
            }
          });
        });
      });
    }
  };

  // 4. Mobile Menu Navigation toggle & Nav links
  var MobileMenu = {
    init: function () {
      var toggle = document.querySelector('.header-mobile-toggle');
      var nav = document.getElementById('HeaderNav');

      if (toggle && nav) {
        toggle.addEventListener('click', function () {
          var isOpen = nav.classList.toggle('mobile-open');
          toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          
          // Toggle Lucide icon dynamically
          var icon = toggle.querySelector('[data-lucide]');
          if (icon && window.lucide) {
            icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
            lucide.createIcons();
          }
        });

        // Close mobile menu and handle special data-actions when clicking navigation links
        var navLinks = nav.querySelectorAll('.header-nav-link');
        navLinks.forEach(function (link) {
          link.addEventListener('click', function () {
            nav.classList.remove('mobile-open');
            toggle.setAttribute('aria-expanded', 'false');
            
            var icon = toggle.querySelector('[data-lucide]');
            if (icon && window.lucide) {
              icon.setAttribute('data-lucide', 'menu');
              lucide.createIcons();
            }

            if (link.getAttribute('data-action') === 'open-ritual') {
              setTimeout(function () {
                var tab = document.querySelector('[data-tab^="ritual-"]');
                if (tab) {
                  tab.click();
                  var fp = document.getElementById('FeaturedProduct');
                  if (fp) fp.scrollIntoView({ behavior: 'smooth' });
                }
              }, 50);
            }
          });
        });
      }
    }
  };

  // 5. Product Variant Selector
  var VariantSelector = {
    init: function () {
      var sections = document.querySelectorAll('.pdp-section, .featured-product-section');
      
      sections.forEach(function (section) {
        var productJsonEl = section.querySelector('script[id^="ProductJson-"]');
        if (!productJsonEl) return;

        var product = JSON.parse(productJsonEl.textContent);
        var radios = section.querySelectorAll('input[class^="variant-radio-"]');
        var hiddenInput = section.querySelector('input[id^="ProductVariantId-"]');
        var priceDisplay = section.querySelector('[id^="PriceDisplay-"]');
        var compareDisplay = section.querySelector('[id^="ComparePriceDisplay-"]');
        var buyButton = section.querySelector('[id^="AddToCartBtn-"]');
        var mainImage = section.querySelector('.pdp-main-image');

        if (!hiddenInput) return;

        function updateVariant() {
          var selectedOptions = [];
          var checkedRadios = section.querySelectorAll('input[class^="variant-radio-"]:checked');
          checkedRadios.forEach(function (radio) {
            var position = parseInt(radio.getAttribute('data-option-position')) - 1;
            selectedOptions[position] = radio.value;
          });

          // Find matching variant
          var variant = product.variants.find(function (v) {
            return v.options.every(function (opt, idx) {
              return opt === selectedOptions[idx];
            });
          });

          if (variant) {
            hiddenInput.value = variant.id;

            var priceFormatted = window.theme.formatMoney(variant.price);
            if (priceDisplay) {
              priceDisplay.textContent = priceFormatted;
            }

            if (compareDisplay) {
              if (variant.compare_at_price > variant.price) {
                compareDisplay.textContent = window.theme.formatMoney(variant.compare_at_price);
                compareDisplay.style.display = 'inline';
              } else {
                compareDisplay.style.display = 'none';
              }
            }

            if (buyButton) {
              if (variant.available) {
                buyButton.disabled = false;
                buyButton.classList.remove('button-disabled');
                buyButton.textContent = window.theme.strings.addToOrder || "Add to Order";
              } else {
                buyButton.disabled = true;
                buyButton.classList.add('button-disabled');
                buyButton.textContent = window.theme.strings.soldOut || "Sold Out";
              }
            }

            // Update main image if variant has a featured image
            if (variant.featured_image && mainImage) {
              mainImage.style.opacity = '0.3';
              mainImage.style.transition = 'opacity 0.15s ease-out';
              setTimeout(function () {
                mainImage.src = variant.featured_image.src;
                mainImage.style.opacity = '1';
              }, 150);

              // Also highlight corresponding thumbnail
              var thumbnails = section.querySelectorAll('.product-thumbnail');
              thumbnails.forEach(function (thumb) {
                var thumbSrc = thumb.getAttribute('data-image-src');
                if (thumbSrc && thumbSrc.includes(variant.featured_image.src.split('/').pop().split('?')[0])) {
                  thumbnails.forEach(function (t) { t.classList.remove('active'); });
                  thumb.classList.add('active');
                }
              });
            }
          }
        }

        radios.forEach(function (radio) {
          radio.addEventListener('change', updateVariant);
        });
      });
    }
  };

  // Expose Cart Drawer globally so html buttons can trigger it
  window.theme.CartDrawer = CartDrawer;

  // Run modules on DOM loaded
  document.addEventListener('DOMContentLoaded', function () {
    CartDrawer.init();
    ProductGallery.init();
    PdpTabs.init();
    MobileMenu.init();
    VariantSelector.init();
  });

})();
