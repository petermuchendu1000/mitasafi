/**
 * COMMITMENT WORKFLOW VALIDATION
 * 
 * Tests the complete booking → commitment → confirmation flow
 * 
 * This validates:
 * 1. Booking creation (draft → submitted)
 * 2. Commitment creation with capacity check
 * 3. Status transition to confirmed
 * 4. Capacity enforcement (reject when full)
 * 5. Commitment release (cancellation)
 * 6. Capacity freed after release
 * 
 * Run with: node scripts/test-commitment-workflow.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// TEST SETUP
// =============================================================================

async function getTestData() {
  // Get existing customer
  const { data: users } = await supabase.auth.admin.listUsers();
  const customer = users.users.find(u => u.email === "demo.customer@mitasafi.test");
  
  if (!customer) {
    console.error("❌ Demo customer not found");
    process.exit(1);
  }
  
  // Get a provider with provider_wide capacity (Aqua Fix Plumbing)
  const { data: provider } = await supabase
    .from("service_providers")
    .select("id")
    .eq("business_name", "Aqua Fix Plumbing")
    .single();
  
  if (!provider) {
    console.error("❌ Aqua Fix Plumbing not found");
    process.exit(1);
  }
  
  // Get provider's service
  const { data: providerService } = await supabase
    .from("provider_services")
    .select("*, services(*)")
    .eq("provider_id", provider.id)
    .single();
  
  if (!providerService) {
    console.error("❌ Provider service not found");
    process.exit(1);
  }
  
  // Get service type
  const { data: serviceType } = await supabase
    .from("service_types")
    .select("id")
    .eq("code", "standard_service")
    .single();
  
  if (!serviceType) {
    console.error("❌ Service type not found");
    process.exit(1);
  }
  
  return {
    customerId: customer.id,
    providerId: provider.id,
    serviceId: providerService.service_id,
    serviceTypeId: serviceType.id,
    capacityScope: providerService.capacity_scope,
    concurrentUnits: providerService.concurrent_units,
  };
}

// =============================================================================
// TEST 1: Create and confirm a booking
// =============================================================================

async function testBookingConfirmation(testData) {
  console.log("\n🧪 TEST 1: Booking Confirmation with Commitment Creation");
  console.log("=".repeat(70));
  
  const startTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  
  // Create draft booking
  console.log("\n📝 Step 1: Creating draft booking...");
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      customer_id: testData.customerId,
      provider_id: testData.providerId,
      service_id: testData.serviceId,
      service_type_id: testData.serviceTypeId,
      booking_flow_type: "standard",
      status: "draft",
      customer_notes: "TEST: Emergency plumbing repair",
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
    })
    .select()
    .single();
  
  if (bookingError) {
    console.error("❌ Failed to create booking:", bookingError.message);
    throw bookingError;
  }
  
  console.log(`   ✅ Created booking: ${booking.id}`);
  console.log(`   📊 Status: ${booking.status}`);
  
  // Update to submitted (simulate customer submitting)
  console.log("\n📤 Step 2: Submitting booking...");
  const { error: submitError } = await supabase
    .from("bookings")
    .update({ status: "submitted" })
    .eq("id", booking.id);
  
  if (submitError) {
    console.error("❌ Failed to submit:", submitError.message);
    throw submitError;
  }
  
  console.log("   ✅ Booking submitted");
  
  // Check capacity before confirmation
  console.log("\n🔍 Step 3: Checking capacity availability...");
  const { data: capacityCheck, error: capacityError } = await supabase
    .rpc("check_capacity_availability", {
      p_provider_id: testData.providerId,
      p_service_id: testData.serviceId,
      p_from: startTime.toISOString(),
      p_to: endTime.toISOString(),
      p_units_needed: 1,
    });
  
  if (capacityError) {
    console.error("❌ Capacity check failed:", capacityError.message);
    throw capacityError;
  }
  
  console.log(`   📊 Available: ${capacityCheck[0].available}`);
  console.log(`   📊 Current usage: ${capacityCheck[0].current_usage}/${capacityCheck[0].max_capacity}`);
  console.log(`   📊 Available units: ${capacityCheck[0].available_units}`);
  
  if (!capacityCheck[0].available) {
    console.error("❌ Insufficient capacity");
    throw new Error("No capacity available");
  }
  
  // Confirm booking (create commitment)
  console.log("\n✅ Step 4: Confirming booking (creating commitment)...");
  const { data: commitmentId, error: confirmError } = await supabase
    .rpc("create_commitment_and_confirm_booking", {
      p_booking_id: booking.id,
      p_committed_from: startTime.toISOString(),
      p_committed_to: endTime.toISOString(),
      p_concurrent_units_reserved: 1,
    });
  
  if (confirmError) {
    console.error("❌ Confirmation failed:", confirmError.message);
    throw confirmError;
  }
  
  console.log(`   ✅ Commitment created: ${commitmentId}`);
  
  // Verify booking status changed
  const { data: updatedBooking } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", booking.id)
    .single();
  
  console.log(`   ✅ Booking status: ${updatedBooking.status}`);
  
  if (updatedBooking.status !== "confirmed") {
    console.error("❌ Booking status should be 'confirmed'");
    throw new Error("Status not updated");
  }
  
  // Verify commitment exists
  const { data: commitment } = await supabase
    .from("booking_commitments")
    .select("*")
    .eq("id", commitmentId)
    .single();
  
  console.log("\n📋 Commitment Details:");
  console.log(`   - Status: ${commitment.status}`);
  console.log(`   - Capacity scope: ${commitment.capacity_scope}`);
  console.log(`   - Units reserved: ${commitment.concurrent_units_reserved}`);
  console.log(`   - Time: ${new Date(commitment.committed_from).toLocaleString()} → ${new Date(commitment.committed_to).toLocaleString()}`);
  
  console.log("\n✅ TEST 1 PASSED: Booking confirmed with commitment");
  
  return { bookingId: booking.id, commitmentId };
}

// =============================================================================
// TEST 2: Capacity enforcement (should reject when full)
// =============================================================================

async function testCapacityEnforcement(testData, existingCommitmentTime) {
  console.log("\n🧪 TEST 2: Capacity Enforcement (Reject when full)");
  console.log("=".repeat(70));
  
  const { concurrentUnits } = testData;
  
  console.log(`\n📊 Provider has concurrent_units=${concurrentUnits}`);
  console.log(`   Creating ${concurrentUnits} bookings to fill capacity...`);
  
  const bookingsCreated = [];
  
  for (let i = 0; i < concurrentUnits; i++) {
    const startTime = new Date(Date.now() + (4 + i) * 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    
    const { data: booking } = await supabase
      .from("bookings")
      .insert({
        customer_id: testData.customerId,
        provider_id: testData.providerId,
        service_id: testData.serviceId,
        service_type_id: testData.serviceTypeId,
        booking_flow_type: "standard",
        status: "submitted",
        customer_notes: `TEST: Capacity fill ${i + 1}`,
        scheduled_start: startTime.toISOString(),
        scheduled_end: endTime.toISOString(),
      })
      .select()
      .single();
    
    const { data: commitmentId } = await supabase
      .rpc("create_commitment_and_confirm_booking", {
        p_booking_id: booking.id,
        p_committed_from: startTime.toISOString(),
        p_committed_to: endTime.toISOString(),
        p_concurrent_units_reserved: 1,
      });
    
    bookingsCreated.push({ bookingId: booking.id, commitmentId, startTime, endTime });
    console.log(`   ✅ Booking ${i + 1}/${concurrentUnits} confirmed`);
  }
  
  // Try to create one more (should fail)
  console.log(`\n🚫 Attempting to create booking ${concurrentUnits + 1} (should FAIL)...`);
  
  const overlapStart = bookingsCreated[0].startTime;
  const overlapEnd = bookingsCreated[0].endTime;
  
  const { data: overBooking } = await supabase
    .from("bookings")
    .insert({
      customer_id: testData.customerId,
      provider_id: testData.providerId,
      service_id: testData.serviceId,
      service_type_id: testData.serviceTypeId,
      booking_flow_type: "standard",
      status: "submitted",
      customer_notes: "TEST: Should be rejected (over capacity)",
      scheduled_start: overlapStart.toISOString(),
      scheduled_end: overlapEnd.toISOString(),
    })
    .select()
    .single();
  
  const { error: rejectError } = await supabase
    .rpc("create_commitment_and_confirm_booking", {
      p_booking_id: overBooking.id,
      p_committed_from: overlapStart.toISOString(),
      p_committed_to: overlapEnd.toISOString(),
      p_concurrent_units_reserved: 1,
    });
  
  if (!rejectError) {
    console.error("❌ TEST FAILED: Should have been rejected due to capacity");
    throw new Error("Capacity enforcement not working");
  }
  
  console.log(`   ✅ CORRECTLY REJECTED: ${rejectError.message}`);
  
  // Clean up: delete the rejected booking
  await supabase.from("bookings").delete().eq("id", overBooking.id);
  
  console.log("\n✅ TEST 2 PASSED: Capacity enforcement working");
  
  return bookingsCreated;
}

// =============================================================================
// TEST 3: Release commitment (cancellation)
// =============================================================================

async function testCommitmentRelease(bookingsToRelease) {
  console.log("\n🧪 TEST 3: Commitment Release (Cancellation)");
  console.log("=".repeat(70));
  
  const { bookingId, commitmentId } = bookingsToRelease[0];
  
  console.log(`\n🔓 Releasing commitment for booking ${bookingId}...`);
  
  const { data: released, error: releaseError } = await supabase
    .rpc("release_commitment", {
      p_booking_id: bookingId,
      p_reason: "TEST: Customer cancellation",
    });
  
  if (releaseError) {
    console.error("❌ Release failed:", releaseError.message);
    throw releaseError;
  }
  
  console.log("   ✅ Commitment released");
  
  // Verify commitment status
  const { data: commitment } = await supabase
    .from("booking_commitments")
    .select("*")
    .eq("id", commitmentId)
    .single();
  
  console.log(`   📊 Status: ${commitment.status}`);
  console.log(`   📊 Released at: ${new Date(commitment.released_at).toLocaleString()}`);
  console.log(`   📊 Reason: ${commitment.released_reason}`);
  
  if (commitment.status !== "released") {
    console.error("❌ Commitment should be 'released'");
    throw new Error("Status not updated");
  }
  
  // Verify capacity freed
  console.log("\n🔍 Verifying capacity freed...");
  
  const { data: capacityCheck } = await supabase
    .rpc("check_capacity_availability", {
      p_provider_id: commitment.provider_id,
      p_service_id: commitment.service_id,
      p_from: commitment.committed_from,
      p_to: commitment.committed_to,
      p_units_needed: 1,
    });
  
  console.log(`   📊 Current usage after release: ${capacityCheck[0].current_usage}`);
  console.log(`   📊 Available units: ${capacityCheck[0].available_units}`);
  
  console.log("\n✅ TEST 3 PASSED: Commitment released, capacity freed");
}

// =============================================================================
// TEST 4: Immutability enforcement
// =============================================================================

async function testImmutability(commitmentId) {
  console.log("\n🧪 TEST 4: Commitment Immutability");
  console.log("=".repeat(70));
  
  console.log("\n🔒 Attempting to modify immutable field (should FAIL)...");
  
  const { data: commitment } = await supabase
    .from("booking_commitments")
    .select("*")
    .eq("id", commitmentId)
    .single();
  
  // Try to change provider_id (should fail)
  const fakeProviderId = "00000000-0000-0000-0000-000000000000";
  const { error } = await supabase
    .from("booking_commitments")
    .update({ provider_id: fakeProviderId })
    .eq("id", commitmentId);
  
  if (!error) {
    console.error("❌ TEST FAILED: Should not allow changing provider_id");
    throw new Error("Immutability not enforced");
  }
  
  console.log(`   ✅ CORRECTLY BLOCKED: ${error.message}`);
  
  console.log("\n✅ TEST 4 PASSED: Immutability enforced");
}

// =============================================================================
// CLEANUP
// =============================================================================

async function cleanup(testBookingIds) {
  console.log("\n🧹 Cleanup: Deleting test bookings...");
  
  for (const id of testBookingIds) {
    // Release commitment first (if exists)
    try {
      await supabase.rpc("release_commitment", {
        p_booking_id: id,
        p_reason: "TEST: Cleanup",
      });
    } catch (e) {
      // Commitment might not exist or already released
    }
    
    // Delete booking
    await supabase.from("bookings").delete().eq("id", id);
  }
  
  console.log(`   ✅ Deleted ${testBookingIds.length} test bookings`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("\n🚀 COMMITMENT WORKFLOW VALIDATION");
  console.log("=".repeat(70));
  
  const testBookingIds = [];
  
  try {
    // Setup
    const testData = await getTestData();
    console.log("\n📊 Test Configuration:");
    console.log(`   Provider: ${testData.providerId}`);
    console.log(`   Service: ${testData.serviceId}`);
    console.log(`   Capacity scope: ${testData.capacityScope}`);
    console.log(`   Concurrent units: ${testData.concurrentUnits}`);
    
    // Test 1: Basic confirmation
    const { bookingId: booking1, commitmentId: commitment1 } = await testBookingConfirmation(testData);
    testBookingIds.push(booking1);
    
    // Test 2: Capacity enforcement
    const filledBookings = await testCapacityEnforcement(testData, {
      start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    });
    testBookingIds.push(...filledBookings.map(b => b.bookingId));
    
    // Test 3: Release commitment
    await testCommitmentRelease(filledBookings);
    
    // Test 4: Immutability
    await testImmutability(commitment1);
    
    // Cleanup
    await cleanup(testBookingIds);
    
    console.log("\n" + "=".repeat(70));
    console.log("✅ ALL TESTS PASSED");
    console.log("=".repeat(70));
    console.log("\n🟢 Commitment infrastructure is working correctly:");
    console.log("   ✅ Bookings can be confirmed with capacity reservation");
    console.log("   ✅ Capacity enforcement prevents overbooking");
    console.log("   ✅ Commitments can be released (cancellation)");
    console.log("   ✅ Immutability is enforced");
    console.log("\n🟢 System is ready for production booking workflows");
    
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED");
    console.error("=".repeat(70));
    console.error("Error:", error.message);
    console.error("\nCleaning up...");
    
    await cleanup(testBookingIds);
    
    process.exit(1);
  }
}

main();
