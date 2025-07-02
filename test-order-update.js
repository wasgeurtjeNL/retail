// Test script voor updateOrder functionaliteit
const testUpdateOrder = async () => {
    const testData = {
        orderId: '0b204a27-8186-4507-a01e-7c7cd2853b82', // Existing order ID
        updates: {
            notes: 'Test update via API - ' + new Date().toISOString(),
            fulfillment_status: 'shipped'
        }
    };
    
    try {
        console.log('Testing updateOrder API with:', testData);
        
        const response = await fetch('http://localhost:3000/api/test-update-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        
        console.log('API Response Status:', response.status);
        console.log('API Response:', result);
        
        if (result.success) {
            console.log('✅ UpdateOrder test PASSED');
            console.log('Updated order:', result.order);
        } else {
            console.log('❌ UpdateOrder test FAILED');
            console.log('Error details:', result.details);
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
};

// Run the test
testUpdateOrder(); 