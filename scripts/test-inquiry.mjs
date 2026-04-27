// Test inquiry API
const response = await fetch("http://localhost:3000/api/inquiries", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    listing_id: "b1dba6e2-8000-44c1-9c0a-3bcb8596f492",
    landlord_id: "test-landlord-id",
    phone: "+254712345678",
  }),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Response:", JSON.stringify(data, null, 2));
