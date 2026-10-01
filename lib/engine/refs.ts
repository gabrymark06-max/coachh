// Evidence used by each engine rule. IDs refer to lib/evidence.json (synced from ../coach-brain).
const p = (...ids: string[]) => ids.map(x => (x.startsWith('doi-') ? x : 'pmid-' + x));

export const R = {
  // Safety
  screening: p('26473759', '21800945'),
  guidelines: p('33239350', '35228201', '31685526'),
  painLoad: p('17307888', '29925502', '34580864'),
  // Strength prescription
  prescription: p('41843416', '37414459'),
  volume: p('41343037', '27433992', '39869076'),
  frequency: p('30236847', '29470825', '38595233', '25932981'),
  effort: p('38970765', '36334240', '33497853', '27531969', '34542869'),
  loads: p('28834797', '37385345'),
  rest: p('39205815'),
  progression: p('36199287', '35038063'),
  deload: p('38499934', '35044672'),
  exerciseChoice: p('37582807', '35438660', '40570881', '36662126', '41055237'),
  timeEfficient: p('34125411', '37523092', '41718208', '31797219'),
  warmup: p('39864808', '26642915', '40513717'),
  injuryPrevention: p('30131332', '24100287', '29053873'),
  maintenance: p('21131862', '23347054'),
  sex: p('32218059', '40028215'),
  older: p('31343601'),
  oneRm: p('16937972'),
  // Running
  intensityDistribution: p('38717713', '39888556', '35418513'),
  intervals: p('26243014', '33826121', '23539308'),
  runProgression: p('40623829', '17940147', '29895234'),
  runInjury: p('38697289', '33635519', '27729482'),
  runStrength: p('38165636', '29249083', '33956587', '40016936'),
  taper: p('37163550', '17762369'),
  zones: p('35507232', '11153730'),
  load: p('11708692', '29163016', '26423706'),
  heat: p('26069301', '29129022'),
  shoes: p('35993829', '41586014', '36057913'),
  detraining: p('10966148', '10999420'),
  racePrediction: p('31575820'),
  // Hybrid
  concurrent: p('34757594', '41762427', '33751469'),
  order: p('28917030', '39195602'),
  // Recovery
  sleep: p('33144349', '35708888', '37462808'),
  stress: p('24343323'),
  overtraining: p('23247672'),
  caffeineSleep: p('36870101'),
  // Nutrition
  energyEstimate: p('15883556', '26920240'),
  deficit: p('34623696', '21558571', '24864135', '28925405'),
  surplus: p('37914977', '31247944'),
  protein: p('28698222', '28642676'),
  proteinDeficit: p('24092765', '26817506'),
  proteinTiming: p('23459753', '38118410', '30895177', '24299050'),
  carbs: p('26920240', '21660838', '41885724', '35215506'),
  fueling: p('21660838', '40650376', '28332114'),
  hydration: p('17277604', '28316971'),
  supplements: p('39074168', '30926628', '29589768'),
  plant: p('28924423', '33599941'),
  reds: p('37752011', '32661127'),
  weighing: p('25521523', '33762040'),
  dietPattern: p('28488692', '26024494'),
  // Body recomposition and fat loss
  cardioFatLoss: p('19127177', '42144246', '28513103', '17848941'),
  steps: p('35247352', '33239350'),
  bodyFat: p('30030479', '38104490'),
  recomposition: p('42144246', '34623696', '23097268', '26817506'),
  dietBreak: p('33587549', '28925405'),
  satiety: p('23097268', '27030531', '28488692'),
  // Behaviour
  habit: p('25851609', '26479070', '26445201'),
  enjoyment: p('39103923', '21780850', '22726453'),
  personalization: p('38878117', '34819869'),
  cycle: p('32661839', '42160459', '37755666'),
};
export type RefKey = keyof typeof R;
export const cite = (...keys: RefKey[]) => [...new Set(keys.flatMap(k => R[k]))];
