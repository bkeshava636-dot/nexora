import test from "node:test";
import assert from "node:assert/strict";

// Mirror validation & formatting logic from artifacts/api-server/src/routes/marketplace.ts
const marketplaceCategoryValues = [
  "Textbooks",
  "Notes & Binders",
  "Lab Equipment",
  "Electronics & Gadgets",
  "Other Campus Items",
];

const marketplaceConditionValues = [
  "Brand New",
  "Like New",
  "Good",
  "Fair",
];

function validateMarketplaceInput(payload) {
  const { title, description, category, price, condition, sellerName, sellerContact, sellerInstagram } = payload ?? {};

  if (!title || typeof title !== "string" || title.trim().length < 3) {
    return { valid: false, error: "Title must be at least 3 characters." };
  }
  if (!description || typeof description !== "string" || description.trim().length < 5) {
    return { valid: false, error: "Description must be at least 5 characters." };
  }
  if (!sellerName || typeof sellerName !== "string" || sellerName.trim().length < 2) {
    return { valid: false, error: "Seller name is required." };
  }

  const cleanContact = typeof sellerContact === "string" && sellerContact.trim().length >= 5
    ? sellerContact.trim().slice(0, 50)
    : "";

  const cleanInstagram = typeof sellerInstagram === "string" && sellerInstagram.trim()
    ? sellerInstagram.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")
    : null;

  if (!cleanContact && !cleanInstagram) {
    return { valid: false, error: "At least one contact method (WhatsApp phone number or Instagram handle) is required." };
  }

  const rawPrice = Number(price);
  if (Number.isNaN(rawPrice) || rawPrice < 0 || rawPrice > 50000) {
    return { valid: false, error: "Price must be between 0 and 50,000." };
  }

  const validCategory = marketplaceCategoryValues.includes(category) ? category : "Textbooks";
  const validCondition = marketplaceConditionValues.includes(condition) ? condition : "Good";

  return {
    valid: true,
    data: {
      title: title.trim(),
      description: description.trim(),
      category: validCategory,
      price: Math.round(rawPrice),
      condition: validCondition,
      sellerName: sellerName.trim(),
      sellerContact: cleanContact,
      sellerInstagram: cleanInstagram,
    },
  };
}

function formatWhatsAppUrl(sellerContact, sellerName, itemTitle) {
  const cleanPhone = sellerContact.replace(/[^0-9]/g, "");
  if (cleanPhone.length < 10) return null;
  const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const text = encodeURIComponent(
    `Hi ${sellerName}, I saw your listing for "${itemTitle}" on Nexora Campus Trade. Is it still available?`
  );
  return `https://wa.me/${phoneWithCountry}?text=${text}`;
}

test("Campus Trade — Marketplace Validation & Contact Generation", async (t) => {
  await t.test("Rejects payloads with missing or short titles", () => {
    const res = validateMarketplaceInput({
      title: "ab",
      description: "Engineering Mathematics 4th edition",
      price: 250,
      sellerName: "Aditya",
      sellerContact: "9876543210",
    });
    assert.equal(res.valid, false);
    assert.match(res.error, /Title must be at least 3 characters/);
  });

  await t.test("Rejects negative or excessive prices", () => {
    const negativeRes = validateMarketplaceInput({
      title: "Casio fx-991EX Calculator",
      description: "Classwiz scientific calculator in perfect working condition",
      price: -50,
      sellerName: "Varun",
      sellerContact: "9876543210",
    });
    assert.equal(negativeRes.valid, false);

    const excessiveRes = validateMarketplaceInput({
      title: "Scientific Calculator",
      description: "Scientific calculator with solar panel",
      price: 999999,
      sellerName: "Varun",
      sellerContact: "9876543210",
    });
    assert.equal(excessiveRes.valid, false);
  });

  await t.test("Accepts valid listing and falls back to safe defaults for unknown category", () => {
    const res = validateMarketplaceInput({
      title: "Engineering Drafter + Clips",
      description: "Complete mini drafter set used for 1st year CAED lab",
      category: "UnknownCustomCat",
      condition: "Like New",
      price: 350,
      sellerName: "Sneha R",
      sellerContact: "9123456780",
    });
    assert.equal(res.valid, true);
    assert.equal(res.data.category, "Textbooks", "Falls back to default valid category");
    assert.equal(res.data.condition, "Like New");
    assert.equal(res.data.price, 350);
  });

  await t.test("Formats direct WhatsApp contact link correctly with country code", () => {
    const url10Digit = formatWhatsAppUrl("9876543210", "Sneha", "Engineering Drafter");
    assert.equal(
      url10Digit,
      "https://wa.me/919876543210?text=Hi%20Sneha%2C%20I%20saw%20your%20listing%20for%20%22Engineering%20Drafter%22%20on%20Nexora%20Campus%20Trade.%20Is%20it%20still%20available%3F"
    );

    const urlCountryIncluded = formatWhatsAppUrl("+91 9876543210", "Sneha", "Engineering Drafter");
    assert.equal(
      urlCountryIncluded,
      "https://wa.me/919876543210?text=Hi%20Sneha%2C%20I%20saw%20your%20listing%20for%20%22Engineering%20Drafter%22%20on%20Nexora%20Campus%20Trade.%20Is%20it%20still%20available%3F"
    );

    const invalidPhone = formatWhatsAppUrl("123", "Sneha", "Drafter");
    assert.equal(invalidPhone, null, "Returns null for invalid phone numbers");
  });

  await t.test("Allows listing with WhatsApp only, Instagram only, or both", () => {
    // 1. WhatsApp only
    const waOnly = validateMarketplaceInput({
      title: "Lab Coat White (Size L)",
      description: "Clean chemistry lab coat, worn for 2 semesters",
      sellerName: "Pooja",
      sellerContact: "9876543210",
      sellerInstagram: "",
      price: 200,
    });
    assert.equal(waOnly.valid, true);
    assert.equal(waOnly.data.sellerContact, "9876543210");
    assert.equal(waOnly.data.sellerInstagram, null);

    // 2. Instagram only
    const instaOnly = validateMarketplaceInput({
      title: "Casio Calculator fx-991ES",
      description: "Scientific calculator with 417 functions",
      sellerName: "Kiran",
      sellerContact: "",
      sellerInstagram: "@kiran_pes_trades",
      price: 450,
    });
    assert.equal(instaOnly.valid, true);
    assert.equal(instaOnly.data.sellerContact, "");
    assert.equal(instaOnly.data.sellerInstagram, "kiran_pes_trades");

    // 3. Both WhatsApp and Instagram
    const both = validateMarketplaceInput({
      title: "Circuit Theory Textbook",
      description: "Textbook with solved VTU past question papers",
      sellerName: "Rohan",
      sellerContact: "9876501234",
      sellerInstagram: "https://instagram.com/rohan_ee/",
      price: 300,
    });
    assert.equal(both.valid, true);
    assert.equal(both.data.sellerContact, "9876501234");
    assert.equal(both.data.sellerInstagram, "rohan_ee");

    // 4. Neither WhatsApp nor Instagram -> must reject
    const neither = validateMarketplaceInput({
      title: "Data Structures Handouts",
      description: "Complete module notes and lab manuals",
      sellerName: "Anonymous",
      sellerContact: "",
      sellerInstagram: "",
      price: 100,
    });
    assert.equal(neither.valid, false);
    assert.match(neither.error, /At least one contact method/);
  });
});
