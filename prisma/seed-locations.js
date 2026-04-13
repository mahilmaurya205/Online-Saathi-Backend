// Seed location data: Countries, States, Districts
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌍 Seeding location data...\n');

  // Create India
  console.log('Creating India...');
  const india = await prisma.country.upsert({
    where: { code: 'IN' },
    update: {},
    create: {
      name: 'India',
      code: 'IN',
      phoneCode: '+91',
      isActive: true
    }
  });
  console.log('✅ India created\n');

  // Create states for India (Sample - add more as needed)
  const statesData = [
    {
      name: 'Gujarat',
      code: 'GJ',
      districts: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Mehsana']
    },
    {
      name: 'Maharashtra',
      code: 'MH',
      districts: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur', 'Satara']
    },
    {
      name: 'Rajasthan',
      code: 'RJ',
      districts: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara', 'Sikar', 'Pali']
    },
    {
      name: 'Madhya Pradesh',
      code: 'MP',
      districts: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Ratlam', 'Dewas', 'Satna', 'Rewa']
    },
    {
      name: 'Karnataka',
      code: 'KA',
      districts: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubli', 'Belagavi', 'Kalaburagi', 'Davangere', 'Ballari', 'Vijayapura', 'Shivamogga']
    },
    {
      name: 'Tamil Nadu',
      code: 'TN',
      districts: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore', 'Erode', 'Thoothukkudi', 'Dindigul']
    },
    {
      name: 'Delhi',
      code: 'DL',
      districts: ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'North East Delhi', 'North West Delhi', 'South West Delhi', 'Shahdara']
    },
    {
      name: 'Uttar Pradesh',
      code: 'UP',
      districts: ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad']
    },
    {
      name: 'West Bengal',
      code: 'WB',
      districts: ['Kolkata', 'Howrah', 'Darjeeling', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra']
    },
    {
      name: 'Telangana',
      code: 'TG',
      districts: ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Siddipet']
    }
  ];

  console.log(`Creating ${statesData.length} states with districts...\n`);

  for (const stateData of statesData) {
    console.log(`  📍 Creating state: ${stateData.name}`);
    
    const state = await prisma.state.upsert({
      where: { 
        name_countryId: {
          name: stateData.name,
          countryId: india.id
        }
      },
      update: {},
      create: {
        name: stateData.name,
        code: stateData.code,
        countryId: india.id,
        isActive: true,
        districtsCount: stateData.districts.length
      }
    });

    // Create districts for this state
    for (const districtName of stateData.districts) {
      await prisma.district.upsert({
        where: {
          name_stateId: {
            name: districtName,
            stateId: state.id
          }
        },
        update: {},
        create: {
          name: districtName,
          stateId: state.id,
          isActive: true
        }
      });
    }
    
    console.log(`    ✅ ${stateData.districts.length} districts created\n`);
  }

  // Update India states count
  await prisma.country.update({
    where: { id: india.id },
    data: { statesCount: statesData.length }
  });

  console.log('='.repeat(60));
  console.log('✅ Location seeding completed!');
  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`   Countries: 1 (India)`);
  console.log(`   States: ${statesData.length}`);
  console.log(`   Total Districts: ${statesData.reduce((sum, s) => sum + s.districts.length, 0)}`);
  console.log('\n🔗 API Endpoints:');
  console.log('   GET /api/location/countries');
  console.log('   GET /api/location/states/:countryId');
  console.log('   GET /api/location/districts/:stateId');
  console.log('   GET /api/location/hierarchy/:countryId');
  console.log('   GET /api/location/search?query=abc&type=state\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding locations:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
