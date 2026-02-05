<?php
session_start();
require_once '../config/database.php';
require_once '../includes/mobile-header.php';
?>

<div class="mobile-container">
    <!-- AppBar -->
    <div class="app-bar">
        <div class="app-bar-left">
            <div class="logo">YBT<span>Digital</span></div>
        </div>
        <div class="app-bar-right">
            <button class="icon-btn" onclick="toggleDarkMode()">
                <i class="fas fa-moon"></i>
            </button>
            <?php if(isset($_SESSION['user_id'])): ?>
                <a href="profile.php" class="icon-btn">
                    <i class="fas fa-user"></i>
                </a>
            <?php else: ?>
                <a href="login.php" class="icon-btn">
                    <i class="fas fa-sign-in-alt"></i>
                </a>
            <?php endif; ?>
        </div>
    </div>

    <!-- Hero Section -->
    <section class="hero-section">
        <div class="hero-content">
            <h1 class="hero-title">Digital Products That Transform</h1>
            <p class="hero-subtitle">Premium templates, tools & resources for creators</p>
            <a href="products.php" class="btn btn-primary btn-lg btn-block">
                <i class="fas fa-rocket"></i> Explore Products
            </a>
        </div>
        <div class="hero-image">
            <img src="../assets/images/hero-mobile.svg" alt="Digital Products">
        </div>
    </section>

    <!-- Featured Products -->
    <section class="section">
        <div class="section-header">
            <h2 class="section-title">Featured Products</h2>
            <a href="products.php" class="see-all">See All</a>
        </div>
        
        <div class="products-list">
            <?php
            $stmt = $pdo->query("SELECT * FROM products WHERE status = 'active' ORDER BY RAND() LIMIT 4");
            while($product = $stmt->fetch(PDO::FETCH_ASSOC)):
            ?>
            <div class="product-card">
                <div class="product-image">
                    <img src="<?= $product['screenshots'] ? json_decode($product['screenshots'])[0] : '../assets/images/default-product.jpg' ?>" alt="<?= htmlspecialchars($product['title']) ?>">
                </div>
                <div class="product-info">
                    <h3 class="product-title"><?= htmlspecialchars($product['title']) ?></h3>
                    <p class="product-description"><?= htmlspecialchars(substr($product['short_description'], 0, 60)) ?>...</p>
                    <div class="product-footer">
                        <span class="product-price">$<?= number_format($product['price'], 2) ?></span>
                        <a href="product-detail.php?id=<?= $product['id'] ?>" class="btn btn-outline">
                            <i class="fas fa-eye"></i> View
                        </a>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </div>
    </section>

    <!-- Testimonials -->
    <section class="section dark-bg">
        <h2 class="section-title">What Our Customers Say</h2>
        <div class="testimonials">
            <div class="testimonial-card">
                <div class="testimonial-content">
                    <p>"The quality exceeded my expectations. Instant download and great support!"</p>
                </div>
                <div class="testimonial-author">
                    <strong>Sarah Johnson</strong>
                    <span>Web Designer</span>
                </div>
            </div>
        </div>
    </section>

    <!-- FAQ Section -->
    <section class="section">
        <h2 class="section-title">Frequently Asked Questions</h2>
        <div class="faq-list">
            <div class="faq-item">
                <div class="faq-question">
                    <span>How do I download purchased products?</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="faq-answer">
                    <p>After payment, go to "My Orders" section. Click download button next to each product.</p>
                </div>
            </div>
        </div>
    </section>
</div>

<?php require_once '../includes/mobile-nav.php'; ?>
<?php require_once '../includes/footer.php'; ?>