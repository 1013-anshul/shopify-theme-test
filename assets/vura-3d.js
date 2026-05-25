/**
 * VURA 3D Product Explorer
 * Custom Spline Runtime Integration
 */

import { Application } from 'https://unpkg.com/@splinetool/runtime/build/runtime.js';

class VuraSplineExplorer {
  constructor(canvasId, splineUrl) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.splineUrl = splineUrl || 'https://prod.spline.design/kXTSqgQH8fas0rHZ/scene.splinecode';
    this.init();
  }

  alignWrapperToPlaceholder() {
    const pinWrapper = document.querySelector('.vura-hero-explorer-pin-wrapper');
    const floatingWrapper = document.querySelector('.vura-spline-wrapper.floating');
    const placeholderBlock = document.querySelector('.hero-placeholder-block');
    
    if (pinWrapper && floatingWrapper && placeholderBlock) {
      const pinRect = pinWrapper.getBoundingClientRect();
      const blockRect = placeholderBlock.getBoundingClientRect();
      
      floatingWrapper.style.left = `${blockRect.left - pinRect.left}px`;
      floatingWrapper.style.top = `${blockRect.top - pinRect.top}px`;
      floatingWrapper.style.width = `${blockRect.width}px`;
      floatingWrapper.style.height = `${blockRect.height}px`;
    }
  }

  async init() {
    this.alignWrapperToPlaceholder();
    window.addEventListener('resize', () => {
      this.alignWrapperToPlaceholder();
    });

    this.app = new Application(this.canvas);
    
    try {
      await this.app.load(this.splineUrl);
      console.log('Vura Spline 3D Scene Loaded successfully.');
      
      // Post-load setup
      this.initIntersectionObserver();
      this.initListeners();
      this.initScrollAnimation();
    } catch (error) {
      console.error('Error loading Spline 3D Scene:', error);
    }
  }

  initIntersectionObserver() {
    // Optimization: Pause rendering when out of viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (this.app && typeof this.app.play === 'function') {
            this.app.play();
          }
        } else {
          if (this.app && typeof this.app.stop === 'function') {
            this.app.stop();
          }
        }
      });
    }, { threshold: 0.1 });

    observer.observe(this.canvas);
  }

  initListeners() {
    // Prevent touch hijack by checking if we have active user interaction
    this.canvas.addEventListener('touchmove', (e) => {
      if (document.body.classList.contains('spline-interacting')) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  initScrollAnimation() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger not loaded.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const pinWrapper = document.querySelector('.vura-hero-explorer-pin-wrapper');
    const floatingWrapper = document.querySelector('.vura-spline-wrapper.floating');
    const placeholder = document.querySelector('.vura-spline-placeholder');
    const explorerSection = document.querySelector('.vura-3d-section');
    const overlay = document.getElementById('splineTouchOverlay');

    if (!pinWrapper || !floatingWrapper || !placeholder) return;

    // 1. Calculate dynamic morph targets based on viewport layout
    const getMorphTargets = () => {
      const pinRect = pinWrapper.getBoundingClientRect();
      const placeholderRect = placeholder.getBoundingClientRect();
      const isMobile = window.innerWidth <= 991;
      
      return {
        left: placeholderRect.left - pinRect.left,
        top: placeholderRect.top - pinRect.top,
        width: placeholderRect.width,
        height: placeholderRect.height,
        borderRadius: isMobile ? 12 : 24
      };
    };

    // 2. Create the GSAP ScrollTrigger timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pinWrapper,
        start: 'top top',
        end: '+=150%', // Pinned scroll length
        pin: true,
        scrub: 1.0,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (self.progress >= 0.99) {
            floatingWrapper.classList.add('interactive');
            if (overlay) overlay.classList.add('visible');
          } else {
            floatingWrapper.classList.remove('interactive');
            if (overlay) {
              overlay.classList.remove('visible');
              overlay.classList.remove('active');
            }
            document.body.classList.remove('spline-interacting');
          }
        }
      }
    });

    // A. Fade out Hero main text and marquee
    tl.to('.hero-copy', {
      opacity: 0,
      y: -60,
      duration: 0.35,
      ease: 'power1.out'
    }, 0);

    tl.to('.hero-trust-bar', {
      opacity: 0,
      y: -30,
      duration: 0.25,
      ease: 'power1.out'
    }, 0);

    // B. Fade in the 3D explorer layout container
    tl.to(explorerSection, {
      opacity: 1,
      visibility: 'visible',
      duration: 0.35
    }, 0.2);

    // C. Morph the floating Spline wrapper into its placeholder
    tl.to(floatingWrapper, {
      left: () => getMorphTargets().left,
      top: () => getMorphTargets().top,
      width: () => getMorphTargets().width,
      height: () => getMorphTargets().height,
      borderRadius: () => getMorphTargets().borderRadius + 'px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
      duration: 0.8,
      ease: 'power1.inOut'
    }, 0.1);

    // D. Fade & slide in Explorer Specs columns from the sides
    tl.fromTo('.vura-layout-left', 
      { opacity: 0, x: -50 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' },
      0.4
    );

    tl.fromTo('.vura-layout-right', 
      { opacity: 0, x: 50 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' },
      0.4
    );

    // E. Animate Spline 3D Camera zoom/tilt and accessory groups
    const cameraObj = this.app.findObjectByName('Camera');
    if (cameraObj) {
      const defaultZ = cameraObj.position.z;
      const defaultY = cameraObj.position.y;
      const defaultX = cameraObj.rotation.x;

      // Start: Zoom in closer, lift camera Y to shift model down in frame, and tilt slightly up
      cameraObj.position.z = defaultZ * 0.80;
      cameraObj.position.y = defaultY + defaultZ * 0.08; 
      cameraObj.rotation.x = defaultX - 0.12;

      tl.to(cameraObj.position, {
        y: defaultY,
        z: defaultZ,
        duration: 0.8,
        ease: 'power1.inOut'
      }, 0.1);

      tl.to(cameraObj.rotation, {
        x: defaultX,
        duration: 0.8,
        ease: 'power1.inOut'
      }, 0.1);
    }

    // Spin floating orange & blueberry groups inside Spline
    const orangeObj = this.app.findObjectByName('orange');
    const blueberryObj = this.app.findObjectByName('blueberry');

    if (orangeObj) {
      tl.to(orangeObj.rotation, {
        y: orangeObj.rotation.y + Math.PI * 1.5,
        x: orangeObj.rotation.x + 0.4,
        duration: 0.9,
        ease: 'power1.inOut'
      }, 0);
    }

    if (blueberryObj) {
      tl.to(blueberryObj.rotation, {
        y: blueberryObj.rotation.y - Math.PI * 1.2,
        z: blueberryObj.rotation.z + 0.3,
        duration: 0.9,
        ease: 'power1.inOut'
      }, 0);
    }

    // F. Parallax story stamps inside #story
    if (document.querySelectorAll('.stamp').length > 0) {
      gsap.utils.toArray('.stamp').forEach(stamp => {
        const depth = parseFloat(stamp.getAttribute('data-parallax')) || 0.2;
        gsap.fromTo(stamp, 
          { y: -120 * depth },
          {
            y: 120 * depth,
            ease: 'none',
            scrollTrigger: {
              trigger: '#story',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          }
        );
      });
    }

    // Refresh ScrollTrigger and listen to resizes
    ScrollTrigger.refresh();
    window.addEventListener('resize', () => {
      ScrollTrigger.refresh();
    });
  }
}

// Global initialization
const initVura3D = () => {
  const canvasId = 'canvas3d';
  const canvasEl = document.getElementById(canvasId);
  if (canvasEl) {
    const url = canvasEl.getAttribute('data-spline-url') || 'https://prod.spline.design/kXTSqgQH8fas0rHZ/scene.splinecode';
    window.VuraSpline = new VuraSplineExplorer(canvasId, url);
  }

  // Handle Lab Swatches and Info Panels transitions
  const buttons = document.querySelectorAll('.lab-control-tab');
  const details = document.querySelectorAll('.lab-detail-panel');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const activeIng = btn.getAttribute('data-ingredient');
      
      // Update buttons active class
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update text detail panels with a smooth fade
      details.forEach((panel) => {
        if (panel.id === `detail-${activeIng}`) {
          panel.style.display = 'block';
          if (typeof gsap !== 'undefined') {
            gsap.fromTo(panel, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });
          } else {
            panel.style.opacity = '1';
          }
        } else {
          panel.style.display = 'none';
        }
      });
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVura3D);
} else {
  initVura3D();
}

