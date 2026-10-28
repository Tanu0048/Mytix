/**
 * Mytix Mobile App Showcase - Static Landing Page JavaScript
 * Handles navbar interactions, mobile menu, FAQ accordion, and scroll spies
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sticky Navbar shadow on scroll
  const navbar = document.getElementById('navbar');
  const handleScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // 2. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      mobileToggle.classList.toggle('active', isOpen);
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu when clicking any nav link
    const navLinks = navMenu.querySelectorAll('.nav-link, .btn');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 3. Interactive FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Optional: Close other open FAQs
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherBtn = otherItem.querySelector('.faq-question');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle current item
        item.classList.toggle('active', !isActive);
        questionBtn.setAttribute('aria-expanded', String(!isActive));
      });
    }
  });

  // 4. Hero Phone Mockup Screen Switcher
  const screenTabs = document.querySelectorAll('.mockup-tab-btn');
  const heroScreenImg = document.getElementById('hero-screen-img');

  if (screenTabs.length > 0 && heroScreenImg) {
    screenTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        screenTabs.forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        const targetSrc = tab.getAttribute('data-screen');
        if (targetSrc && heroScreenImg.getAttribute('src') !== targetSrc) {
          heroScreenImg.classList.add('fade-out');
          setTimeout(() => {
            heroScreenImg.src = targetSrc;
            heroScreenImg.onload = () => {
              heroScreenImg.classList.remove('fade-out');
            };
          }, 150);
        }
      });
    });
  }

  // 5. Active Navbar Link on Scroll (Intersection Observer)
  const sections = document.querySelectorAll('section[id]');
  const navLinkElements = document.querySelectorAll('.nav-link[href^="#"]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          navLinkElements.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${currentId}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, {
      rootMargin: '-20% 0px -70% 0px'
    });

    sections.forEach(sec => observer.observe(sec));
  }
});
