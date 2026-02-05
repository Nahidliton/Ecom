<?php
session_start();
require_once 'config/database.php';

// Detect device type
function isMobileDevice() {
    $userAgent = $_SERVER['HTTP_USER_AGENT'];
    $mobileKeywords = [
        'android', 'webos', 'iphone', 'ipad', 'ipod', 
        'blackberry', 'windows phone', 'mobile'
    ];
    
    foreach ($mobileKeywords as $keyword) {
        if (stripos($userAgent, $keyword) !== false) {
            return true;
        }
    }
    return false;
}

// Check for forced view parameter
if (isset($_GET['view'])) {
    $_SESSION['force_view'] = $_GET['view'];
}

// Determine which view to show
if (isset($_SESSION['force_view'])) {
    $view = $_SESSION['force_view'];
} else {
    $view = isMobileDevice() ? 'mobile' : 'desktop';
}

// Redirect to appropriate view
header("Location: $view/index.php");
exit;
?>