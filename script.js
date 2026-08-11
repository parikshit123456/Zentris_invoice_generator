let itemCount = 0;

function addItem(desc = "", hsn = "", qty = "", rate = "", unit = "pcs", gstRate = "5") {
  itemCount++;
  const id = itemCount;
  const div = document.createElement('div');
  div.className = 'item-block';
  div.id = 'item-' + id;
  div.innerHTML = `
    <button type="button" class="remove-item" onclick="removeItem(${id})">×</button>
    <label>Description</label>
    <input type="text" class="it-desc" value="${desc}" oninput="render()">
    <div class="row2">
      <div><label>HSN/SAC</label><input type="text" class="it-hsn" value="${hsn}" oninput="render()"></div>
      <div><label>Unit</label><input type="text" class="it-unit" value="${unit}" oninput="render()"></div>
    </div>
    <div class="row2">
      <div><label>Quantity</label><input type="number" class="it-qty" value="${qty}" oninput="render()"></div>
      <div><label>Rate</label><input type="number" class="it-rate" value="${rate}" step="0.01" oninput="render()"></div>
    </div>
    <label>IGST Rate for this item (%)</label>
    <input type="number" class="it-gst" value="${gstRate}" step="0.01" oninput="render()">
  `;
  document.getElementById('itemsContainer').appendChild(div);
  render();
}

function removeItem(id) {
  const el = document.getElementById('item-' + id);
  if (el) el.remove();
  render();
}

function toggleSameAsShip() {
  const same = document.getElementById('sameAsShip').checked;
  document.getElementById('buyerFields').style.display = same ? 'none' : 'block';
  render();
}

// ---------- Number to words (Indian numbering) ----------
function numToWords(num) {
  num = Math.round(num);
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function twoDigit(n) { if (n < 20) return ones[n]; return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''); }
  function threeDigit(n) { if (n < 100) return twoDigit(n); return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigit(n % 100) : ''); }
  let crore = Math.floor(num / 10000000); num %= 10000000;
  let lakh = Math.floor(num / 100000); num %= 100000;
  let thousand = Math.floor(num / 1000); num %= 1000;
  let hundred = num;
  let parts = [];
  if (crore) parts.push(threeDigit(crore) + ' Crore');
  if (lakh) parts.push(threeDigit(lakh) + ' Lakh');
  if (thousand) parts.push(threeDigit(thousand) + ' Thousand');
  if (hundred) parts.push(threeDigit(hundred));
  return parts.join(' ');
}

function amountInWords(num) {
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let words = 'Indian Rupees ' + numToWords(rupees) + ' Only';
  if (paise > 0) { words = 'Indian Rupees ' + numToWords(rupees) + ' and ' + numToWords(paise) + ' Paise Only'; }
  return words;
}

function fmt(n) { return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function val(id) { return document.getElementById(id).value; }
function setText(id, text) { document.getElementById(id).innerText = text; }

function render() {
  setText('out_invNo', val('invNo'));
  setText('out_invDate', val('invDate'));
  setText('out_deliveryNote', val('deliveryNote'));
  setText('out_paymentTerms', val('paymentTerms'));
  setText('out_refNo', val('refNo'));
  setText('out_otherRef', val('otherRef'));
  setText('out_buyerOrderNo', val('buyerOrderNo'));
  setText('out_buyerOrderDate', val('buyerOrderDate'));
  setText('out_dispatchDocNo', val('dispatchDocNo'));
  setText('out_deliveryNoteDate', val('deliveryNoteDate'));
  setText('out_dispatchedThrough', val('dispatchedThrough'));
  setText('out_destination', val('destination'));
  setText('out_termsDelivery', val('termsDelivery'));

  setText('out_shipName', val('shipName'));
  setText('out_shipAddress', val('shipAddress'));
  setText('out_shipPhone', val('shipPhone'));
  setText('out_shipState', val('shipState'));

  const same = document.getElementById('sameAsShip').checked;
  setText('out_buyName', same ? val('shipName') : val('buyName'));
  setText('out_buyAddress', same ? val('shipAddress') : val('buyAddress'));
  setText('out_buyPhone', same ? val('shipPhone') : val('buyPhone'));
  setText('out_buyState', same ? val('shipState') : val('buyState'));

  setText('out_bankName', val('bankName'));
  setText('out_bankAcc', val('bankAcc'));
  setText('out_bankIFS', val('bankIFS'));

  const blocks = document.querySelectorAll('.item-block');
  const tbody = document.getElementById('itemsTableBody');
  tbody.innerHTML = '';
  let totalQty = 0, taxableTotal = 0, igstGrandAmount = 0;
  // Group by HSN + GST rate, since two items can share an HSN but carry different rates
  const hsnMap = {};
  let lastUnit = 'pcs';

  blocks.forEach((block, i) => {
    const desc = block.querySelector('.it-desc').value;
    const hsn = block.querySelector('.it-hsn').value;
    const unit = block.querySelector('.it-unit').value;
    const qty = parseFloat(block.querySelector('.it-qty').value) || 0;
    const rate = parseFloat(block.querySelector('.it-rate').value) || 0;
    const gstRate = parseFloat(block.querySelector('.it-gst').value) || 0;
    const amount = qty * rate;
    const itemIgst = amount * gstRate / 100;

    totalQty += qty;
    taxableTotal += amount;
    igstGrandAmount += itemIgst;
    lastUnit = unit || lastUnit;

    if (hsn) {
      const key = hsn + '||' + gstRate;
      if (!hsnMap[key]) hsnMap[key] = { hsn, gstRate, taxable: 0 };
      hsnMap[key].taxable += amount;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="center">${i + 1}</td>
      <td>${desc}</td>
      <td class="center">${hsn}</td>
      <td class="right">${qty ? qty + ' ' + unit : ''}</td>
      <td class="right">${rate ? rate.toFixed(2) : ''}</td>
      <td class="center">${unit}</td>
      <td class="right">${amount ? fmt(amount) : ''}</td>
    `;
    tbody.appendChild(tr);
  });

  const grandTotal = taxableTotal + igstGrandAmount;

  if (blocks.length > 0) {
    const totalIgstTr = document.createElement('tr');
    totalIgstTr.innerHTML = `
      <td colspan="6" class="right bold">Total IGST</td>
      <td class="right bold">${fmt(igstGrandAmount)}</td>
    `;
    tbody.appendChild(totalIgstTr);
  }

  setText('out_totalQty', totalQty ? totalQty + ' ' + lastUnit : '');
  setText('out_grandTotal', '₹ ' + fmt(grandTotal));
  setText('out_amountWords', amountInWords(grandTotal));

  const hsnBody = document.getElementById('hsnSummaryBody');
  hsnBody.innerHTML = '';
  Object.keys(hsnMap).forEach(key => {
    const { hsn, gstRate, taxable } = hsnMap[key];
    const tax = taxable * gstRate / 100;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${hsn}</td>
      <td class="right">${fmt(taxable)}</td>
      <td class="center">${gstRate}%</td>
      <td class="right">${fmt(tax)}</td>
      <td class="right">${fmt(tax)}</td>
    `;
    hsnBody.appendChild(tr);
  });

  setText('out_taxableTotal', fmt(taxableTotal));
  setText('out_taxTotal', fmt(igstGrandAmount));
  setText('out_taxTotal2', fmt(igstGrandAmount));
  setText('out_taxWords', amountInWords(igstGrandAmount));
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.form-panel input, .form-panel textarea').forEach(el => {
    el.addEventListener('input', render);
  });

  // preload 5 sample item rows, each with its own GST rate, so the
  // per-item tax feature is demonstrated correctly out of the box
  addItem('Surgical Cotton\n500 Gm Gross', '5608', 300, 62.00, 'pcs', 5);
  addItem('Elastic Crepe Bandage\n4 inch', '3005', 200, 28.50, 'pcs', 12);
  addItem('Disposable Syringe\n5ml', '9018', 500, 6.75, 'pcs', 5);
  addItem('Adhesive Plaster\n1 inch x 5m', '3005', 150, 18.00, 'pcs', 18);
  addItem('Surgical Gloves\nMedium (Pair)', '4015', 400, 9.25, 'pcs', 5);
  render();
});