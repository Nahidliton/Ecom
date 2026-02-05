<?php
session_start();
require_once '../config/database.php';

// Check admin authentication
if (!isset($_SESSION['admin_id']) || $_SESSION['admin_role'] != 'admin') {
    header('Location: index.php');
    exit;
}

// Get dashboard stats
$stats = [
    'total_sales' => $pdo->query("SELECT SUM(final_amount) FROM orders WHERE payment_status = 'completed'")->fetchColumn(),
    'total_orders' => $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn(),
    'total_users' => $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(),
    'total_products' => $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn(),
    'today_sales' => $pdo->query("SELECT SUM(final_amount) FROM orders WHERE DATE(created_at) = CURDATE() AND payment_status = 'completed'")->fetchColumn(),
    'pending_orders' => $pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn(),
];

// Get recent orders
$recent_orders = $pdo->query("
    SELECT o.*, u.name as customer_name 
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
    ORDER BY o.created_at DESC 
    LIMIT 10
")->fetchAll(PDO::FETCH_ASSOC);

// Get top products
$top_products = $pdo->query("
    SELECT p.title, COUNT(oi.product_id) as sales_count, SUM(oi.price) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_id
    ORDER BY sales_count DESC
    LIMIT 5
")->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - YBT Digital</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --sidebar-width: 260px;
            --header-height: 70px;
            --primary-color: #4361ee;
            --secondary-color: #3a0ca3;
            --success-color: #4cc9f0;
            --danger-color: #f72585;
            --warning-color: #f8961e;
            --dark-bg: #0f172a;
            --light-bg: #f8fafc;
            --surface-color: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border-color: #e2e8f0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--light-bg);
            color: var(--text-primary);
            display: flex;
            min-height: 100vh;
        }

        .sidebar {
            width: var(--sidebar-width);
            background: var(--surface-color);
            border-right: 1px solid var(--border-color);
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }

        .sidebar-header {
            padding: 24px;
            border-bottom: 1px solid var(--border-color);
        }

        .brand {
            font-size: 24px;
            font-weight: 700;
            color: var(--primary-color);
        }

        .brand span {
            color: var(--secondary-color);
        }

        .sidebar-menu {
            padding: 20px 0;
        }

        .menu-item {
            display: flex;
            align-items: center;
            padding: 14px 24px;
            color: var(--text-secondary);
            text-decoration: none;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
        }

        .menu-item:hover,
        .menu-item.active {
            background: rgba(67, 97, 238, 0.1);
            color: var(--primary-color);
            border-left-color: var(--primary-color);
        }

        .menu-icon {
            width: 24px;
            margin-right: 12px;
            font-size: 18px;
        }

        .main-content {
            flex: 1;
            margin-left: var(--sidebar-width);
            padding: 0;
        }

        .topbar {
            height: var(--header-height);
            background: var(--surface-color);
            border-bottom: 1px solid var(--border-color);
            padding: 0 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .page-title {
            font-size: 24px;
            font-weight: 600;
        }

        .user-menu {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .content-wrapper {
            padding: 32px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 24px;
            margin-bottom: 32px;
        }

        .stat-card {
            background: var(--surface-color);
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border: 1px solid var(--border-color);
        }

        .stat-icon {
            width: 56px;
            height: 56px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-bottom: 16px;
        }

        .stat-icon.sales { background: rgba(67, 97, 238, 0.1); color: var(--primary-color); }
        .stat-icon.orders { background: rgba(76, 201, 240, 0.1); color: var(--success-color); }
        .stat-icon.users { background: rgba(248, 150, 30, 0.1); color: var(--warning-color); }
        .stat-icon.products { background: rgba(247, 37, 133, 0.1); color: var(--danger-color); }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 14px;
        }

        .stat-change {
            font-size: 14px;
            margin-top: 8px;
        }

        .stat-change.positive { color: #10b981; }
        .stat-change.negative { color: #ef4444; }

        .dashboard-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 32px;
        }

        .chart-container,
        .recent-container {
            background: var(--surface-color);
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border: 1px solid var(--border-color);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
        }

        .table-responsive {
            overflow-x: auto;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
        }

        .data-table th,
        .data-table td {
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .data-table th {
            font-weight: 600;
            color: var(--text-secondary);
            background: var(--light-bg);
        }

        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }

        .status-completed { background: #d1fae5; color: #065f46; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-failed { background: #fee2e2; color: #991b1b; }

        .btn {
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background: var(--primary-color);
            color: white;
        }

        .btn-primary:hover {
            background: var(--secondary-color);
        }

        .btn-sm {
            padding: 6px 12px;
            font-size: 14px;
        }

        .top-products {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .product-item {
            display: flex;
            align-items: center;
            padding: 12px;
            border-radius: 8px;
            background: var(--light-bg);
        }

        .product-info {
            flex: 1;
        }

        .product-title {
            font-weight: 500;
            margin-bottom: 4px;
        }

        .product-sales {
            font-size: 14px;
            color: var(--text-secondary);
        }

        @media (max-width: 1200px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }

            .sidebar.active {
                transform: translateX(0);
            }

            .main-content {
                margin-left: 0;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <!-- Sidebar -->
    <aside class="sidebar">
        <div class="sidebar-header">
            <div class="brand">YBT<span>Digital</span></div>
        </div>
        
        <nav class="sidebar-menu">
            <a href="dashboard.php" class="menu-item active">
                <i class="fas fa-tachometer-alt menu-icon"></i>
                <span>Dashboard</span>
            </a>
            <a href="products.php" class="menu-item">
                <i class="fas fa-box menu-icon"></i>
                <span>Products</span>
            </a>
            <a href="orders.php" class="menu-item">
                <i class="fas fa-shopping-cart menu-icon"></i>
                <span>Orders</span>
                <span class="badge"><?= $stats['pending_orders'] ?></span>
            </a>
            <a href="users.php" class="menu-item">
                <i class="fas fa-users menu-icon"></i>
                <span>Users</span>
            </a>
            <a href="coupons.php" class="menu-item">
                <i class="fas fa-tag menu-icon"></i>
                <span>Coupons</span>
            </a>
            <a href="reports.php" class="menu-item">
                <i class="fas fa-chart-bar menu-icon"></i>
                <span>Reports</span>
            </a>
            <a href="support-tickets.php" class="menu-item">
                <i class="fas fa-headset menu-icon"></i>
                <span>Support Tickets</span>
            </a>
            <a href="settings.php" class="menu-item">
                <i class="fas fa-cog menu-icon"></i>
                <span>Settings</span>
            </a>
        </nav>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <!-- Topbar -->
        <header class="topbar">
            <div class="page-title">Dashboard Overview</div>
            <div class="user-menu">
                <div class="user-info">
                    <div class="user-name">Admin User</div>
                    <div class="user-role">Super Admin</div>
                </div>
                <a href="../logout.php" class="btn btn-primary btn-sm">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </div>
        </header>

        <!-- Content -->
        <div class="content-wrapper">
            <!-- Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon sales">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-value">$<?= number_format($stats['total_sales'], 2) ?></div>
                    <div class="stat-label">Total Sales</div>
                    <div class="stat-change positive">
                        <i class="fas fa-arrow-up"></i> 12.5% from last month
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon orders">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-value"><?= number_format($stats['total_orders']) ?></div>
                    <div class="stat-label">Total Orders</div>
                    <div class="stat-change positive">
                        <i class="fas fa-arrow-up"></i> 8.3% from last month
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon users">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-value"><?= number_format($stats['total_users']) ?></div>
                    <div class="stat-label">Total Users</div>
                    <div class="stat-change positive">
                        <i class="fas fa-arrow-up"></i> 15.2% from last month
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon products">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="stat-value"><?= number_format($stats['total_products']) ?></div>
                    <div class="stat-label">Total Products</div>
                    <div class="stat-change positive">
                        <i class="fas fa-arrow-up"></i> 5.7% from last month
                    </div>
                </div>
            </div>

            <!-- Dashboard Grid -->
            <div class="dashboard-grid">
                <!-- Recent Orders -->
                <div class="recent-container">
                    <div class="section-header">
                        <h3 class="section-title">Recent Orders</h3>
                        <a href="orders.php" class="btn btn-primary btn-sm">View All</a>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Customer</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach($recent_orders as $order): ?>
                                <tr>
                                    <td>#<?= $order['order_number'] ?></td>
                                    <td><?= htmlspecialchars($order['customer_name']) ?></td>
                                    <td><?= date('M d, Y', strtotime($order['created_at'])) ?></td>
                                    <td>$<?= number_format($order['final_amount'], 2) ?></td>
                                    <td>
                                        <span class="status-badge status-<?= $order['payment_status'] ?>">
                                            <?= ucfirst($order['payment_status']) ?>
                                        </span>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Top Products -->
                <div class="chart-container">
                    <div class="section-header">
                        <h3 class="section-title">Top Selling Products</h3>
                    </div>
                    <div class="top-products">
                        <?php foreach($top_products as $product): ?>
                        <div class="product-item">
                            <div class="product-info">
                                <div class="product-title"><?= htmlspecialchars($product['title']) ?></div>
                                <div class="product-sales">
                                    <?= $product['sales_count'] ?> sales • $<?= number_format($product['revenue'], 2) ?>
                                </div>
                            </div>
                            <div class="product-rank">
                                <span class="rank-badge">#<?= array_search($product, $top_products) + 1 ?></span>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script>
        // Dark mode toggle
        function toggleDarkMode() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        }

        // Initialize theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Mobile menu toggle
        function toggleMobileMenu() {
            document.querySelector('.sidebar').classList.toggle('active');
        }

        // Chart initialization
        function initChart() {
            // Sales chart implementation
            const ctx = document.getElementById('salesChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Sales',
                            data: [12000, 19000, 15000, 25000, 22000, 30000],
                            borderColor: '#4361ee',
                            backgroundColor: 'rgba(67, 97, 238, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }
        }

        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', initChart);
    </script>
</body>
</html>