// Localize any remaining English gameplay notifications without interfering with the Three.js loop.
const translations = new Map([
  ['POLICIA • პოლიცია', 'საქართველოს პოლიცია'],
  ['Police identity accepted. Patrol route active.', 'პატრულის სამსახური დაიწყო. ფორმა და ეკიპაჟი მზადაა.'],
  ['Police vehicle entered. Drive the patrol route.', 'საპატრულო მანქანაში ჩაჯექი. პატრულირებისას გამოიყენე მართვის ღილაკები.'],
  ['Vehicle exited. Back to foot patrol.', 'მანქანიდან გადმოხვედი. გააგრძელე ფეხით პატრულირება.'],
  ['You entered the police station. Operations room and locker access are active.', 'პოლიციის განყოფილებაში ხარ. შეგიძლია ოთახებში გადაადგილება.'],
  ['Police station door closed. You are back on the street.', 'განყოფილებიდან გამოხვედი და ქუჩაში დაბრუნდი.'],
  ['Patrol active. Check suspicious traffic and citizen reports.', 'პატრული აქტიურია. შეამოწმე საეჭვო მოძრაობა და მოქალაქეთა შეტყობინებები.'],
  ['Patrol started. Citizen calls are being routed.', 'პატრული დაიწყო. მოქალაქეთა გამოძახებები შენთან გადმოამისამართდა.'],
  ['Patrol paused. Awaiting new assignment.', 'პატრული შეჩერდა. დაელოდე ახალ დავალებას.'],
  ['Suspect stopped. Documents checked. Warning issued.', 'ეჭვმიტანილი შეჩერდა. დოკუმენტები შემოწმებულია; გაფრთხილება გაიცა.'],
  ['This citizen is behaving suspiciously. Contact a police unit for assistance.', 'მოქალაქე საეჭვოდ იქცევა. დახმარებისთვის პოლიციის ეკიპაჟს დაუკავშირდი.']
]);

function localizeTextNode(node) {
  const value = node.nodeValue?.trim();
  if (!value) return;
  const translated = translations.get(value);
  if (translated) node.nodeValue = node.nodeValue.replace(value, translated);
}

function scan(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    localizeTextNode(node);
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.matches?.('.brand, .status, .stat-box, .message-log, .mission-card, .action-btn, .desktop-help')) {
      for (const child of node.childNodes) scan(child);
    }
  }
}

const observer = new MutationObserver((records) => {
  for (const record of records) {
    if (record.type === 'characterData') localizeTextNode(record.target);
    for (const node of record.addedNodes) scan(node);
  }
});
const hud = document.querySelector('#hud');
if (hud) {
  scan(hud);
  observer.observe(hud, { subtree: true, childList: true, characterData: true });
}
