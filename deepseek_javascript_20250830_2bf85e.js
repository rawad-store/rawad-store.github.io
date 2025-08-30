// function to check for duplicate IDs
function checkDuplicateIDs(products) {
    const ids = products.map(product => product.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    
    if (duplicates.length > 0) {
        console.error("❌ يوجد معرفات مكررة: ", duplicates);
        return false;
    } else {
        console.log("✅ جميع المعرفات فريدة");
        return true;
    }
}

// استدعاء function للفحص
checkDuplicateIDs(products);