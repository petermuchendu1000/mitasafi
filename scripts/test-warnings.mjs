// Test the needsRoleUpgradeWarning function

const roleUpgradeWarnings = {
  'tenant_to_landlord': { fromRole: 'tenant', toRole: 'landlord', isFriction: true },
  'tenant_to_service_provider': { fromRole: 'tenant', toRole: 'service_provider', isFriction: true },
  'landlord_to_service_provider': { fromRole: 'landlord', toRole: 'service_provider', isFriction: true },
  'service_provider_to_landlord': { fromRole: 'service_provider', toRole: 'landlord', isFriction: true },
};

function getRoleUpgradeKey(fromRole, toRole) {
  const key = `${fromRole}_to_${toRole}`;
  return roleUpgradeWarnings[key] ? key : null;
}

function needsRoleUpgradeWarning(currentRoles, newRole) {
  // No warning needed if user already has this role
  if (currentRoles.includes(newRole)) {
    return null;
  }
  
  // No warning for downgrade to tenant (anyone can be a tenant)
  if (newRole === 'tenant') {
    return null;
  }
  
  // Check each current role for upgrade warnings
  for (const currentRole of currentRoles) {
    const key = getRoleUpgradeKey(currentRole, newRole);
    console.log(`  Checking ${currentRole} -> ${newRole}: key=${key}`);
    if (key && roleUpgradeWarnings[key]?.isFriction) {
      return roleUpgradeWarnings[key];
    }
  }
  
  return null;
}

console.log('\n=== TEST CASES ===\n');

console.log('1. landlord -> service_provider:');
const result1 = needsRoleUpgradeWarning(['landlord'], 'service_provider');
console.log('   Result:', result1 ? 'WARNING NEEDED' : 'NO WARNING');

console.log('\n2. tenant -> landlord:');
const result2 = needsRoleUpgradeWarning(['tenant'], 'landlord');
console.log('   Result:', result2 ? 'WARNING NEEDED' : 'NO WARNING');

console.log('\n3. landlord -> landlord (same role):');
const result3 = needsRoleUpgradeWarning(['landlord'], 'landlord');
console.log('   Result:', result3 ? 'WARNING NEEDED' : 'NO WARNING (already has role)');

console.log('\n4. landlord -> tenant:');
const result4 = needsRoleUpgradeWarning(['landlord'], 'tenant');
console.log('   Result:', result4 ? 'WARNING NEEDED' : 'NO WARNING (tenant is free)');
