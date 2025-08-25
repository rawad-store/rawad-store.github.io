// Smooth scrolling for navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Close mobile menu if open
                document.getElementById('navLinks').classList.remove('active');
            });
        });

        // Mobile menu toggle
        document.getElementById('navToggle').addEventListener('click', function() {
            document.getElementById('navLinks').classList.toggle('active');
        });

        // Scroll animation observer
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                }
            });
        }, observerOptions);

        // Observe all scroll-animate elements
        document.querySelectorAll('.scroll-animate').forEach(el => {
            observer.observe(el);
        });

        // Add floating animation to service cards
        document.querySelectorAll('.service-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });

        // Navbar scroll effect
        window.addEventListener('scroll', function() {
            const nav = document.getElementById('nav');
            const backToTop = document.getElementById('backToTop');
            
            if (window.scrollY > 100) {
                nav.classList.add('scrolled');
                backToTop.classList.add('show');
            } else {
                nav.classList.remove('scrolled');
                backToTop.classList.remove('show');
            }
        });

        // Back to top button
        document.getElementById('backToTop').addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // WhatsApp integration
        window.addEventListener('load', () => {
            // Add click tracking for WhatsApp buttons
            document.querySelectorAll('a[href*="wa.me"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    console.log('WhatsApp contact initiated');
                });
            });
        });

        // Copy to clipboard function
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('تم نسخ الرقم: ' + text);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        }
