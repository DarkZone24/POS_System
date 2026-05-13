const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'excel', 'items.xls');
try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (data.length > 0) {
        const headers = data[0];
        console.log('Detected Headers:');
        headers.forEach((h, i) => {
            if (h) console.log(`${i}: ${h}`);
        });

        console.log('\nPotential Name Columns:');
        headers.forEach((h, i) => {
            if (h && (h.includes('DESC') || h.includes('NAME') || h.includes('ITEM'))) console.log(`${i}: ${h}`);
        });

        console.log('\nPotential Price Columns:');
        headers.forEach((h, i) => {
            if (h && (h.includes('RETAIL') || h.includes('PRICE') || h.includes('SRP') || h.includes('COST') || h.includes('WHOLESALE'))) console.log(`${i}: ${h}`);
        });

        console.log('\nPotential Category Columns:');
        headers.forEach((h, i) => {
            if (h && (h.includes('CAT') || h.includes('CLASS') || h.includes('GROUP') || h.includes('TYPE'))) console.log(`${i}: ${h}`);
        });
    }
} catch (err) {
    console.error('Error reading file:', err.message);
}
