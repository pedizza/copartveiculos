import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { deliveryPaymentSummary } from '../public/shared/contract-utils.js';
import { renderAcquisitionContractHtml } from '../src/contracts/template.js';

const schedule = { amountValue: 'R$ 50.000,00', downPayment: 'R$ 10.000,00', downPaymentDate: '2026-10-12',
  remainingPayment: 'R$ 40.000,00', remainingPaymentDate: '2026-10-20' };

test('contract displays both payments with their amounts and dates', () => {
  const notes = deliveryPaymentSummary(schedule);
  const html = renderAcquisitionContractHtml({ amountValue: 50000, paymentMethod: 'Pix', paymentNotes: notes });
  for (const text of ['Entrada + restante na entrega', '10.000,00', '40.000,00', '12/10/2026', '20/10/2026', 'a ser pago na entrega']) {
    assert.ok(html.includes(text), text);
  }
});

test('acquisition term uses the COPART clauses and leaves documentation value editable', () => {
  const blankFee = renderAcquisitionContractHtml({
    sellerName: 'COPART DO BRASIL ORGANIZAÇÃO DE LEILÕES LTDA',
    clientName: 'Comprador <Teste>', clientPhone: '(11) 99999-0000', clientEmail: 'cliente@example.com',
    clientCpf: '123.456.789-00', clientRg: '12.345.678-9', clientAddress: 'Rua Exemplo, 10',
    vehicleName: 'Trator', vehicleYear: '2020', vehicleColor: 'Azul', vehiclePlate: 'ABC1D23', vehicleRenavam: '12345678901',
    amountValue: 50000, paymentMethod: 'PIX', paymentNotes: 'Entrada + parcelas'
  });
  for (const text of ['TERMO DE AQUISIÇÃO', 'COPART DO BRASIL ORGANIZAÇÃO DE LEILÕES LTDA', 'Telefone:', 'RG:', 'Renavam:',
    '________________________', 'garantia de 6 (seis) meses', 'multa moratória de 2%', 'juros de mora de 1%', '30% (trinta por cento)',
    'Lei Geral de Proteção de Dados', 'Comprador &lt;Teste&gt;']) assert.ok(blankFee.includes(text), text);
  assert.ok(!blankFee.includes('R$ 790,00'));

  const withFee = renderAcquisitionContractHtml({ documentationValue: 1250 });
  assert.ok(withFee.includes('R$ 1.250,00') || withFee.includes('R$ 1.250,00'));
});

test('acquisition term lists every vehicle in a multi-vehicle contract', () => {
  const html=renderAcquisitionContractHtml({amountValue:70000,vehicles:[
    {name:'Caminhão <A>',model:'Mercedes 1113',year:'1981',color:'Azul',plate:'ABC1D23',renavam:'123',price:45000},
    {name:'Trator',model:'Massey Ferguson 275',year:'1995',color:'Vermelho',plate:'DEF4G56',renavam:'456',price:25000}
  ]});
  for(const text of ['Caminhão &lt;A&gt;','Mercedes 1113','Massey Ferguson 275','1981','1995','ABC1D23','DEF4G56','R$ 45.000,00','R$ 25.000,00'])assert.ok(html.includes(text),text);
});

test('rejects missing, invalid or inconsistent payments', () => {
  for (const changes of [{ downPayment: '' }, { remainingPayment: 0 }, { remainingPayment: -1 },
    { remainingPayment: 'inválido' }, { remainingPayment: 30000 }, { downPaymentDate: '' },
    { remainingPaymentDate: '' }, { remainingPaymentDate: '2026-02-30' }, { remainingPaymentDate: '2026-10-11' }]) {
    assert.throws(() => deliveryPaymentSummary({ ...schedule, ...changes }));
  }
  assert.doesNotThrow(() => deliveryPaymentSummary({ ...schedule, amountValue: 0.3, downPayment: 0.1, remainingPayment: 0.2 }));
});

test('payment selector enables only fields for the chosen option', () => {
  const element = () => ({ classList: { toggle() {} }, closest() { return this; }, addEventListener() {}, value: '', required: false, disabled: false });
  const ids = Object.fromEntries(['contractCatalogSelect', 'contractVehicleDescription', 'contractInstallments',
    'contractDownPayment', 'contractInstallmentCount', 'contractInstallmentValue', 'contractDownPaymentDate',
    'contractInstallmentDay', 'contractRemainingPayment', 'contractRemainingPaymentDate',
    'contractInstallmentCountLabel', 'contractInstallmentValueLabel'].map(id => [id, element()]));
  const selector = { value: 'cash', addEventListener() {} };
  const context = vm.createContext({ document: { getElementById: id => ids[id] }, contractPaymentNotes: selector });
  const html = fs.readFileSync(new URL('../public/admin.html', import.meta.url), 'utf8');
  const start = html.indexOf('      const installmentFields =');
  const end = html.indexOf('      const paymentSummary =', start);
  vm.runInContext(html.slice(start, end), context);
  const sync = () => vm.runInContext('syncPaymentFields()', context);
  for (const mode of ['delivery', 'installments', 'annual', 'cash']) {
    selector.value = mode;
    sync();
    assert.equal(ids.contractDownPayment.required, mode !== 'cash');
    assert.equal(ids.contractRemainingPayment.required, mode === 'delivery');
    assert.equal(ids.contractRemainingPaymentDate.disabled, mode !== 'delivery');
    assert.equal(ids.contractInstallmentCount.required, ['annual', 'installments'].includes(mode));
    assert.equal(ids.contractInstallmentDay.required, mode === 'installments');
  }
});
