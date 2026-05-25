---
name: spline-3d-integration
description: Instructions, guidelines, and code snippets for integrating interactive Spline 3D scenes into Shopify themes and standard web applications with a focus on performance, UX, and seamless styling.
user-invocable: true
---

# Spline 3D Integration Skill

Use this skill whenever you need to integrate interactive 3D assets or scenes designed in Spline (spline.design) into Shopify Liquid themes, standalone HTML pages, or React/Next.js frontends.

---

## 1. Integration Methods

### Method A: `<spline-viewer>` (Low-Code / Web Component)
Best for simple embeds, interactive hero sections, or background visuals. Handles canvas resize, loading state, and basic interactions (orbit, hover, pan) out of the box.

#### Code Snippet:
```html
<!-- Load the Spline Viewer script -->
<script type="module" src="https://unpkg.com/@splinetool/viewer@1.9.0/build/spline-viewer.js"></script>

<!-- Embed the viewer -->
<div class="spline-wrapper">
  <spline-viewer 
    url="https://prod.spline.design/your-scene-id/scene.splinecode"
    loading-anim-type="spinner"
    events-target="global"
    hint="true">
  </spline-viewer>
</div>
```

#### Key Attributes:
*   `url`: The direct link to your `.splinecode` export.
*   `events-target="global"`: Listens to mouse/scroll events on the window, useful for parallax effects that react to cursor movement outside the canvas.
*   `hint="true"`: Displays a brief "drag to rotate" instruction overlay on load.
*   `loading-anim-type`: Options are `spinner` or `none`.

---

### Method B: `@splinetool/runtime` (High Control JS API)
Required when you need to programmatically trigger events, change states/variables inside the Spline scene from external HTML buttons, or bind scene coordinates to custom ScrollTrigger/GSAP timelines.

#### Code Snippet:
```html
<canvas id="canvas3d"></canvas>

<!-- Load Runtime from CDN or install npm packages -->
<script type="module">
  import { Application } from 'https://unpkg.com/@splinetool/runtime@1.9.0/build/runtime.js';

  const canvas = document.getElementById('canvas3d');
  const spline = new Application(canvas);

  spline.load('https://prod.spline.design/your-scene-id/scene.splinecode')
    .then(() => {
      console.log('Spline scene loaded');
      
      // Example: Find an object inside the Spline scene
      const mainObject = spline.findObjectByName('ProductBottle');
      
      // Example: Listen for custom events triggered in Spline
      spline.addEventListener('mouseDown', (e) => {
        if (e.target.name === 'OrderButton') {
          document.dispatchEvent(new CustomEvent('spline-cta-click'));
        }
      });
      
      // Example: Set variables/states programmatically
      // spline.setVariable('ColorState', 1);
    });
</script>
```

---

## 2. Performance Optimizations (Critical)

Spline files contain heavy geometry, shaders, and textures. Always follow these rules to maintain high Core Web Vitals (LCP/INP):

### Rule 1: Lazy Loading script and scene
Do not load the Spline code or script immediately if the 3D element is below the fold. Use an `IntersectionObserver` to trigger loading only when the user is about to view it.

```javascript
// Intersection Observer for Spline lazy loading
const observer = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const container = entry.target;
      const url = container.getAttribute('data-spline-url');
      
      // Dynamically inject spline-viewer or trigger runtime
      const viewer = document.createElement('spline-viewer');
      viewer.setAttribute('url', url);
      container.appendChild(viewer);
      
      obs.unobserve(container);
    }
  });
}, { rootMargin: '200px' });

document.querySelectorAll('.lazy-spline-container').forEach(el => observer.observe(el));
```

### Rule 2: Pause Rendering when out of view
If the Spline canvas is out of the viewport, pause the runtime rendering loop to save CPU/GPU cycles and prevent mobile battery drain.

```javascript
const canvas = document.getElementById('canvas3d');
const spline = new Application(canvas);
spline.load('scene.splinecode').then(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        spline.play(); // Resume rendering
      } else {
        spline.stop(); // Pause rendering
      }
    });
  });
  observer.observe(canvas);
});
```

---

## 3. Shopify Online Store 2.0 Integration

To implement a customizable Spline 3D section in a Shopify theme, create a new Liquid section under `sections/spline-3d.liquid` using the template below.

### Code for `sections/spline-3d.liquid`:
```liquid
{%- comment -%}
  Interactive Spline 3D Section
{%- endcomment -%}

<section class="spline-section spline-section-{{ section.id }}" style="--bg-color: {{ section.settings.bg_color }}">
  <div class="spline-container">
    {%- if section.settings.spline_url != blank -%}
      <div class="lazy-spline-container" data-spline-url="{{ section.settings.spline_url }}">
        <!-- Script loads and inserts <spline-viewer> when visible -->
      </div>
    {%- else -%}
      <div class="spline-placeholder">
        <p>Please configure a Spline Scene URL in theme settings.</p>
      </div>
    {%- endif -%}
  </div>
</section>

<style>
.spline-section-{{ section.id }} {
  background-color: var(--bg-color, transparent);
  width: 100%;
  height: {{ section.settings.height_desktop }}px;
  overflow: hidden;
  position: relative;
}
.spline-container, .lazy-spline-container, spline-viewer {
  width: 100%;
  height: 100%;
}
.spline-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  border: 2px dashed #cccccc;
  color: #888888;
}
@media (max-width: 767px) {
  .spline-section-{{ section.id }} {
    height: {{ section.settings.height_mobile }}px;
  }
}
</style>

<script>
  // Add script library if not present
  if (!window.SplineScriptLoaded) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.9.0/build/spline-viewer.js';
    document.head.appendChild(script);
    window.SplineScriptLoaded = true;
  }

  // Lazy loading observer
  document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const container = entry.target;
          const url = container.getAttribute('data-spline-url');
          if (url) {
            const viewer = document.createElement('spline-viewer');
            viewer.setAttribute('url', url);
            // Copy optional parameters from schema settings
            viewer.setAttribute('hint', '{{ section.settings.show_hint }}');
            container.appendChild(viewer);
          }
          obs.unobserve(container);
        }
      });
    }, { rootMargin: '200px' });

    document.querySelectorAll('.lazy-spline-container').forEach(el => observer.observe(el));
  });
</script>

{% schema %}
{
  "name": "Spline 3D Interactive",
  "settings": [
    {
      "type": "text",
      "id": "spline_url",
      "label": "Spline Scene URL (.splinecode)",
      "info": "Upload your .spline file to Spline and copy the public URL export."
    },
    {
      "type": "color",
      "id": "bg_color",
      "label": "Background Color",
      "default": "#ffffff"
    },
    {
      "type": "range",
      "id": "height_desktop",
      "min": 300,
      "max": 1000,
      "step": 50,
      "unit": "px",
      "label": "Desktop Height",
      "default": 600
    },
    {
      "type": "range",
      "id": "height_mobile",
      "min": 200,
      "max": 800,
      "step": 50,
      "unit": "px",
      "label": "Mobile Height",
      "default": 400
    },
    {
      "type": "checkbox",
      "id": "show_hint",
      "label": "Show Interaction Hint",
      "default": true
    }
  ],
  "presets": [
    {
      "name": "Spline 3D Interactive"
    }
  ]
}
{% endschema %}
```

---

## 4. UX & Touch Interaction Best Practices

1.  **Touch Hijack Prevention**: Always disable Zoom (`zoom: false`) or orbit control triggers on mobile screens unless interaction is strictly necessary. Otherwise, users scrolling down a mobile page will get "trapped" rotating the 3D model instead of moving down the page.
    *   *Tip*: Use `pointer-events: none` on mobile, or wrap the canvas with a touch-to-interact overlay that disables the pointer block when clicked.
2.  **Fallback Assets**: WebGL is occasionally disabled or unsupported on older devices/browsers. Always provide a fallback high-quality `<img>` or autoplay `<video>` asset nested behind or in place of the canvas when rendering fails.
    *   *Tip*: Detect WebGL support: `!!window.WebGLRenderingContext && (!!document.createElement('canvas').getContext('webgl') || !!document.createElement('canvas').getContext('experimental-webgl'))`.
3.  **Color Space Matching**: Match the background color of the Spline canvas exactly with the CSS background color of the surrounding sections (e.g., `#162D24` for Vura Forest Green) to avoid harsh, visible borders around the canvas bounds.
