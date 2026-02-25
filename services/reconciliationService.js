const { Contact } = require('../models/contact');
const { Op } = require('sequelize');

async function identify(email, phoneNumber) {
  console.log('Starting identification for:', { email, phoneNumber });
  // Find all contacts that match either email or phoneNumber
  const conditions = [];
  if (email) conditions.push({ email });
  if (phoneNumber) conditions.push({ phoneNumber });

  if (conditions.length === 0) {
    throw new Error('Email or phoneNumber must be provided');
  }

  let matchingContacts = await Contact.findAll({
    where: {
      [Op.or]: conditions
    }
  });

  // If no matching contacts, create a new primary contact
  if (matchingContacts.length === 0) {
    const newContact = await Contact.create({
      email,
      phoneNumber,
      linkPrecedence: 'primary'
    });
    return formatResponse(newContact, []);
  }

  // Find all related contacts (including secondary ones)
  let allRelatedContacts = [...matchingContacts];
  let processedIds = new Set(allRelatedContacts.map(c => c.id));
  let linkedIds = new Set(allRelatedContacts.map(c => c.linkedId).filter(id => id !== null));
  
  // Expand search to include linked contacts and primary contacts
  let needsMoreSearch = true;
  while (needsMoreSearch) {
    console.log('Search loop iteration. Current related count:', allRelatedContacts.length);
    let searchIds = [...linkedIds].filter(id => !processedIds.has(id));
    let searchLinkedIds = allRelatedContacts.map(c => c.linkedId).filter(id => id !== null && !processedIds.has(id));
    
    // Also search for any contact that shares the same linkedId as our group
    let currentLinkedIds = [...new Set(allRelatedContacts.map(c => c.linkedId || c.id))];

    const moreContacts = await Contact.findAll({
      where: {
        [Op.or]: [
          { id: { [Op.in]: searchIds } },
          { linkedId: { [Op.in]: currentLinkedIds } },
          { id: { [Op.in]: currentLinkedIds } }
        ],
        id: { [Op.notIn]: [...processedIds] }
      }
    });

    if (moreContacts.length === 0) {
      needsMoreSearch = false;
    } else {
      allRelatedContacts.push(...moreContacts);
      moreContacts.forEach(c => {
        processedIds.add(c.id);
        if (c.linkedId) linkedIds.add(c.linkedId);
      });
    }
  }

  // Sort by createdAt to find the oldest contact (Primary)
  allRelatedContacts.sort((a, b) => a.createdAt - b.createdAt);
  
  // The oldest contact in the entire chain should be the primary
  // Exception: If there are multiple primaries in our current list, the oldest one wins
  let primaries = allRelatedContacts.filter(c => c.linkPrecedence === 'primary');
  let primaryContact = primaries[0]; // Oldest primary

  // If there's more than one primary, update others to secondary
  for (let i = 1; i < primaries.length; i++) {
    await primaries[i].update({
      linkPrecedence: 'secondary',
      linkedId: primaryContact.id
    });
    primaries[i].linkPrecedence = 'secondary';
    primaries[i].linkedId = primaryContact.id;
  }

  // Check if we need to create a NEW secondary contact
  const exactMatch = allRelatedContacts.find(c => 
    (email ? c.email === email : true) && 
    (phoneNumber ? c.phoneNumber === phoneNumber : true)
  );

  // If we have a partial match but not an exact match for both email AND phone, create a new secondary
  const emailExists = allRelatedContacts.some(c => c.email === email);
  const phoneExists = allRelatedContacts.some(c => c.phoneNumber === phoneNumber);

  if ((email && !emailExists) || (phoneNumber && !phoneExists) || (!exactMatch && email && phoneNumber)) {
     // Check if this specific combination already exists
     const exists = allRelatedContacts.find(c => c.email === email && c.phoneNumber === phoneNumber);
     if (!exists) {
        const newSecondary = await Contact.create({
          email,
          phoneNumber,
          linkedId: primaryContact.id,
          linkPrecedence: 'secondary'
        });
        allRelatedContacts.push(newSecondary);
     }
  }

  // Ensure all secondary contacts point to the correct primary
  for (let contact of allRelatedContacts) {
    if (contact.id !== primaryContact.id && (contact.linkedId !== primaryContact.id || contact.linkPrecedence !== 'secondary')) {
      await contact.update({
        linkedId: primaryContact.id,
        linkPrecedence: 'secondary'
      });
    }
  }

  return formatResponse(primaryContact, allRelatedContacts);
}

function formatResponse(primaryContact, allRelatedContacts) {
  const emails = new Set();
  const phoneNumbers = new Set();
  const secondaryContactIds = [];

  // Add primary contact info
  if (primaryContact.email) emails.add(primaryContact.email);
  if (primaryContact.phoneNumber) phoneNumbers.add(primaryContact.phoneNumber);

  // Add secondary contacts info
  allRelatedContacts.forEach(c => {
    if (c.id !== primaryContact.id) {
      if (c.email) emails.add(c.email);
      if (c.phoneNumber) phoneNumbers.add(c.phoneNumber);
      secondaryContactIds.push(c.id);
    }
  });

  return {
    contact: {
      primaryContatctId: primaryContact.id,
      emails: [...emails],
      phoneNumbers: [...phoneNumbers],
      secondaryContactIds: secondaryContactIds
    }
  };
}

module.exports = { identify };
