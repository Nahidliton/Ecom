// api/products.php
<?php
require_once '../config/database.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        getProducts();
        break;
    case 'POST':
        createProduct();
        break;
    case 'PUT':
        updateProduct();
        break;
    case 'DELETE':
        deleteProduct();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getProducts() {
    global $pdo;
    
    $category = $_GET['category'] ?? null;
    $search = $_GET['search'] ?? null;
    $minPrice = $_GET['min_price'] ?? 0;
    $maxPrice = $_GET['max_price'] ?? 999999;
    $sort = $_GET['sort'] ?? 'created_at';
    $page = $_GET['page'] ?? 1;
    $limit = $_GET['limit'] ?? 12;
    $offset = ($page - 1) * $limit;
    
    $sql = "SELECT * FROM products WHERE status = 'active' 
            AND price BETWEEN :min_price AND :max_price";
    $params = [':min_price' => $minPrice, ':max_price' => $maxPrice];
    
    if ($category) {
        $sql .= " AND category = :category";
        $params[':category'] = $category;
    }
    
    if ($search) {
        $sql .= " AND (title LIKE :search OR description LIKE :search)";
        $params[':search'] = "%$search%";
    }
    
    $sql .= " ORDER BY $sort DESC LIMIT :limit OFFSET :offset";
    
    $stmt = $pdo->prepare($sql);
    foreach($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count for pagination
    $countSql = str_replace("ORDER BY $sort DESC LIMIT :limit OFFSET :offset", "", $sql);
    $countStmt = $pdo->prepare($countSql);
    foreach($params as $key => $value) {
        $countStmt->bindValue($key, $value);
    }
    $countStmt->execute();
    $total = $countStmt->rowCount();
    
    echo json_encode([
        'products' => $products,
        'total' => $total,
        'page' => $page,
        'total_pages' => ceil($total / $limit)
    ]);
}
?>