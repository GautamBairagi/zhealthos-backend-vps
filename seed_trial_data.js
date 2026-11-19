const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedTrialData() {
  console.log('--- Initializing Safe Trial Seed ---');

  // 1. Resolve Primary Active Clinic
  let clinic = await prisma.clinic.findFirst({
    where: { status: 'Active' },
    orderBy: { createdAt: 'asc' }
  });

  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        displayId: 'CLN-000001',
        name: 'Zealth Allied Health Clinic',
        email: 'info@zealthclinic.com',
        phone: '+61 3 9000 0000',
        address: '100 Collins Street, Melbourne VIC 3000',
        country: 'Australia',
        state: 'Victoria',
        status: 'Active',
        tier: 'Professional'
      }
    });
    console.log(`Created default clinic: ${clinic.name} (${clinic.id})`);
  } else {
    console.log(`Using existing primary clinic: ${clinic.name} (${clinic.id})`);
  }

  // 2. Resolve Primary Branch
  let branch = await prisma.branch.findFirst({
    where: { clinicId: clinic.id }
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        clinicId: clinic.id,
        name: 'Melbourne Central Clinic',
        email: 'melbourne@zealthclinic.com',
        phone: '+61 3 9000 1111',
        address: '100 Collins Street, Melbourne VIC 3000',
        timezone: 'AEDT',
        status: 'Active'
      }
    });
    console.log(`Created branch: ${branch.name}`);
  }

  const securePasswordHash = await bcrypt.hash('Password123!', 10);

  // 3. Ensure Clinic Admin (Zoya Rahman) is properly linked to this clinic
  let clinicAdminUser = await prisma.user.findUnique({
    where: { email: 'clinicadmin@zhealth.com' }
  });

  if (!clinicAdminUser) {
    const uCount = await prisma.user.count();
    clinicAdminUser = await prisma.user.create({
      data: {
        displayId: `USR-${String(uCount + 1).padStart(6, '0')}`,
        email: 'clinicadmin@zhealth.com',
        name: 'Zoya Rahman (Clinic Admin)',
        role: 'CLINIC_ADMIN',
        status: 'ACTIVE',
        passwordHash: securePasswordHash,
        profileData: { clinicId: clinic.id }
      }
    });
    console.log(`Created Clinic Admin user: ${clinicAdminUser.email}`);
  } else {
    await prisma.user.update({
      where: { id: clinicAdminUser.id },
      data: {
        passwordHash: securePasswordHash,
        status: 'ACTIVE',
        profileData: {
          ...(typeof clinicAdminUser.profileData === 'object' && clinicAdminUser.profileData !== null ? clinicAdminUser.profileData : {}),
          clinicId: clinic.id
        }
      }
    });
    console.log(`Updated Clinic Admin user: ${clinicAdminUser.email} linked to clinic ${clinic.id}`);
  }

  // Link admin to branch in user_branches
  if (branch) {
    await prisma.userBranch.upsert({
      where: {
        userId_branchId: {
          userId: clinicAdminUser.id,
          branchId: branch.id
        }
      },
      update: {},
      create: {
        userId: clinicAdminUser.id,
        branchId: branch.id
      }
    }).catch(() => null);
  }

  // 4. Test Practitioners (Two clearly identified trial practitioners)
  const trialPractitioners = [
    {
      email: 'sarah.jenkins@clinic.com',
      name: 'Dr. Sarah Jenkins',
      specialty: 'Physiotherapist',
      color: '#30D2BE',
      phone: '+61 412 100 001',
      fee: 180.0,
      bio: 'Trial Specialist - Musculoskeletal Rehabilitation and Sports Injuries',
      qualifications: ['BPhty (Hons)', 'AHPRA Registered', 'APAM Member'],
      availability: {
        Monday: { available: true, startTime: '09:00', endTime: '17:00' },
        Tuesday: { available: true, startTime: '09:00', endTime: '17:00' },
        Wednesday: { available: true, startTime: '09:00', endTime: '17:00' },
        Thursday: { available: true, startTime: '09:00', endTime: '17:00' },
        Friday: { available: true, startTime: '09:00', endTime: '17:00' }
      }
    },
    {
      email: 'marcus.vance@clinic.com',
      name: 'Dr. Marcus Vance',
      specialty: 'Occupational Therapist',
      color: '#8C4BFF',
      phone: '+61 412 100 002',
      fee: 160.0,
      bio: 'Trial Specialist - Functional Capacity Assessment and Ergonomic Care',
      qualifications: ['BAppSc (OT)', 'AHPRA Registered', 'OTA Member'],
      availability: {
        Monday: { available: true, startTime: '09:00', endTime: '17:00' },
        Tuesday: { available: true, startTime: '09:00', endTime: '17:00' },
        Wednesday: { available: true, startTime: '09:00', endTime: '17:00' },
        Thursday: { available: true, startTime: '09:00', endTime: '17:00' },
        Friday: { available: true, startTime: '09:00', endTime: '17:00' }
      }
    }
  ];

  const seededPractitioners = [];

  for (const pData of trialPractitioners) {
    let pUser = await prisma.user.findUnique({ where: { email: pData.email } });
    if (!pUser) {
      const uCount = await prisma.user.count();
      pUser = await prisma.user.create({
        data: {
          displayId: `USR-${String(uCount + 1).padStart(6, '0')}`,
          email: pData.email,
          name: pData.name,
          role: 'PRACTITIONER',
          status: 'ACTIVE',
          passwordHash: securePasswordHash,
          phone: pData.phone,
          profileData: { clinicId: clinic.id }
        }
      });
      console.log(`Created Practitioner user: ${pUser.email}`);
    } else {
      await prisma.user.update({
        where: { id: pUser.id },
        data: {
          passwordHash: securePasswordHash,
          role: 'PRACTITIONER',
          status: 'ACTIVE',
          profileData: {
            ...(typeof pUser.profileData === 'object' && pUser.profileData !== null ? pUser.profileData : {}),
            clinicId: clinic.id
          }
        }
      });
      console.log(`Updated Practitioner user: ${pUser.email}`);
    }

    let practitioner = await prisma.practitioner.findFirst({
      where: { email: pData.email }
    });

    if (!practitioner) {
      practitioner = await prisma.practitioner.create({
        data: {
          userId: pUser.id,
          clinicId: clinic.id,
          name: pData.name,
          specialty: pData.specialty,
          email: pData.email,
          phone: pData.phone,
          color: pData.color,
          consultationFee: pData.fee,
          bio: pData.bio,
          qualifications: pData.qualifications,
          availability: pData.availability,
          assignedBranches: [branch?.name || 'Melbourne Central Clinic'],
          status: 'Active',
          joinDate: 'Jan 2026'
        }
      });
      console.log(`Created Practitioner profile: ${practitioner.name} (${practitioner.id})`);
    } else {
      practitioner = await prisma.practitioner.update({
        where: { id: practitioner.id },
        data: {
          userId: pUser.id,
          clinicId: clinic.id,
          name: pData.name,
          specialty: pData.specialty,
          phone: pData.phone,
          color: pData.color,
          consultationFee: pData.fee,
          bio: pData.bio,
          qualifications: pData.qualifications,
          availability: pData.availability,
          assignedBranches: [branch?.name || 'Melbourne Central Clinic'],
          status: 'Active'
        }
      });
      console.log(`Updated Practitioner profile: ${practitioner.name} (${practitioner.id})`);
    }

    seededPractitioners.push(practitioner);
  }

  // 5. Test Clients (Two clearly identified trial clients)
  const trialClients = [
    {
      email: 'patient@zhealth.com',
      fullName: 'Oliver Vance',
      dob: '1988-03-24',
      gender: 'Male',
      phone: '+61 412 888 999',
      address: '45 Collins Street',
      city: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      diagnosis: ['Rotator Cuff Tendinopathy'],
      notes: 'Trial Test Client - NDIS Plan Managed upper limb rehabilitation'
    },
    {
      email: 'emma.watson@clinic.com',
      fullName: 'Emma Watson',
      dob: '1992-07-15',
      gender: 'Female',
      phone: '+61 413 777 888',
      address: '88 Bourke Street',
      city: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      diagnosis: ['Post-Surgical Knee Rehabilitation'],
      notes: 'Trial Test Client - Private Health insurance post-surgery physio'
    }
  ];

  const seededPatients = [];

  for (const cData of trialClients) {
    let cUser = await prisma.user.findUnique({ where: { email: cData.email } });
    if (!cUser) {
      const uCount = await prisma.user.count();
      cUser = await prisma.user.create({
        data: {
          displayId: `USR-${String(uCount + 1).padStart(6, '0')}`,
          email: cData.email,
          name: cData.fullName,
          role: 'PATIENT',
          status: 'ACTIVE',
          passwordHash: securePasswordHash,
          phone: cData.phone,
          profileData: { clinicId: clinic.id }
        }
      });
      console.log(`Created Patient user: ${cUser.email}`);
    } else {
      await prisma.user.update({
        where: { id: cUser.id },
        data: {
          passwordHash: securePasswordHash,
          role: 'PATIENT',
          status: 'ACTIVE',
          profileData: {
            ...(typeof cUser.profileData === 'object' && cUser.profileData !== null ? cUser.profileData : {}),
            clinicId: clinic.id
          }
        }
      });
      console.log(`Updated Patient user: ${cUser.email}`);
    }

    let patient = await prisma.patient.findFirst({
      where: { OR: [{ email: cData.email }, { userId: cUser.id }] }
    });

    if (!patient) {
      const pCount = await prisma.patient.count();
      patient = await prisma.patient.create({
        data: {
          displayId: `CLI-${String(pCount + 1).padStart(6, '0')}`,
          userId: cUser.id,
          clinicId: clinic.id,
          fullName: cData.fullName,
          email: cData.email,
          phone: cData.phone,
          dob: cData.dob,
          gender: cData.gender,
          address: cData.address,
          city: cData.city,
          state: cData.state,
          postcode: cData.postcode,
          diagnosis: cData.diagnosis,
          notes: cData.notes,
          status: 'active',
          sessionsAllocated: 12,
          sessionsUsed: 2
        }
      });
      console.log(`Created Patient record: ${patient.fullName} (${patient.id})`);
    } else {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: {
          userId: cUser.id,
          clinicId: clinic.id,
          fullName: cData.fullName,
          email: cData.email,
          phone: cData.phone,
          dob: cData.dob,
          gender: cData.gender,
          address: cData.address,
          city: cData.city,
          state: cData.state,
          postcode: cData.postcode,
          diagnosis: cData.diagnosis,
          notes: cData.notes,
          status: 'active'
        }
      });
      console.log(`Updated Patient record: ${patient.fullName} (${patient.id})`);
    }

    seededPatients.push(patient);
  }

  // 6. Seed Sample Service Items
  const sampleServices = [
    {
      name: 'Physiotherapy Initial Consultation',
      category: 'Therapeutic Supports',
      price: 180.0,
      duration: 60,
      color: '#30D2BE',
      description: 'Comprehensive musculoskeletal assessment and initial treatment'
    },
    {
      name: 'Occupational Therapy Review',
      category: 'Therapeutic Supports',
      price: 160.0,
      duration: 45,
      color: '#8C4BFF',
      description: 'Functional capacity progress evaluation and goal setting'
    }
  ];

  for (const s of sampleServices) {
    const existingService = await prisma.serviceItem.findFirst({
      where: { name: s.name, clinicId: clinic.id }
    });
    if (!existingService) {
      await prisma.serviceItem.create({
        data: {
          clinicId: clinic.id,
          name: s.name,
          category: s.category,
          price: s.price,
          duration: s.duration,
          color: s.color,
          description: s.description
        }
      });
      console.log(`Created Service: ${s.name}`);
    }
  }

  // 7. Seed Sample Appointments for trial workflows
  const testAppointments = [
    {
      patient: seededPatients[0],
      practitioner: seededPractitioners[0],
      service: 'Physiotherapy Initial Consultation',
      time: '10:00',
      endTime: '11:00',
      fee: 180.0
    },
    {
      patient: seededPatients[1],
      practitioner: seededPractitioners[1],
      service: 'Occupational Therapy Review',
      time: '14:00',
      endTime: '14:45',
      fee: 160.0
    }
  ];

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = tomorrow.toISOString().split('T')[0];

  for (const apptData of testAppointments) {
    if (!apptData.patient || !apptData.practitioner) continue;

    const existingAppt = await prisma.appointment.findFirst({
      where: {
        patientId: apptData.patient.id,
        practitionerId: apptData.practitioner.id,
        date: targetDate,
        startTime: apptData.time
      }
    });

    if (!existingAppt) {
      const aCount = await prisma.appointment.count();
      const appt = await prisma.appointment.create({
        data: {
          displayId: `APT-${String(aCount + 1).padStart(6, '0')}`,
          clinicId: clinic.id,
          patientId: apptData.patient.id,
          patientName: apptData.patient.fullName,
          practitionerId: apptData.practitioner.id,
          practitionerName: apptData.practitioner.name,
          branchId: branch?.id || null,
          branchName: branch?.name || 'Melbourne Central Clinic',
          serviceName: apptData.service,
          date: targetDate,
          startTime: apptData.time,
          endTime: apptData.endTime,
          status: 'Scheduled',
          fee: apptData.fee,
          isPaid: false,
          location: 'Melbourne Central Clinic',
          room: 'Consultation Room 1',
          notes: 'Trial demonstration appointment for client workflow verification'
        }
      });
      console.log(`Created Trial Appointment: ${appt.displayId} (${appt.patientName} with ${appt.practitionerName})`);
    } else {
      console.log(`Appointment already exists for ${apptData.patient.fullName} on ${targetDate} at ${apptData.time}`);
    }
  }

  console.log('\n--- Safe Trial Seed Completed Successfully ---');
}

seedTrialData()
  .catch(err => {
    console.error('❌ Error during seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
