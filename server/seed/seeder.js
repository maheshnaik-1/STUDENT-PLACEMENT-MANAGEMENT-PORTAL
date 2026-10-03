const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedDatabase = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placement_portal';
    await mongoose.connect(mongoUri);
    console.log(`[Seeder] Connected to MongoDB: ${mongoUri}`);

    // Clear existing collections
    await User.deleteMany();
    await Company.deleteMany();
    await PlacementDrive.deleteMany();
    await Application.deleteMany();
    console.log('[Seeder] Cleared previous database records.');

    // 1. Create Placement Officer
    const officer = await User.create({
      name: 'Dr. Ramesh Sharma (Training & Placement Officer)',
      email: 'officer@college.edu',
      password: 'Officer@123',
      role: 'officer',
      phone: '+91 98765 43210',
    });

    // 2. Create Sample Students
    const students = await User.create([
      {
        name: 'Rahul Verma',
        email: 'rahul.cse@college.edu',
        password: 'Student@123',
        role: 'student',
        rollNo: '22CS101',
        branch: 'CSE',
        cgpa: 8.85,
        activeBacklogs: 0,
        passingYear: 2026,
        phone: '+91 98123 45671',
        skills: ['React', 'Node.js', 'MongoDB', 'Data Structures', 'C++', 'Git'],
        resumeUrl: 'https://example.com/resumes/rahul_verma_resume.pdf',
      },
      {
        name: 'Priya Nair',
        email: 'priya.it@college.edu',
        password: 'Student@123',
        role: 'student',
        rollNo: '22IT104',
        branch: 'IT',
        cgpa: 7.65,
        activeBacklogs: 0,
        passingYear: 2026,
        phone: '+91 98123 45672',
        skills: ['Java', 'Spring Boot', 'SQL', 'React', 'AWS', 'Docker'],
        resumeUrl: 'https://example.com/resumes/priya_nair_resume.pdf',
      },
      {
        name: 'Sneha Kulkarni',
        email: 'sneha.aids@college.edu',
        password: 'Student@123',
        role: 'student',
        rollNo: '22AI108',
        branch: 'AI&DS',
        cgpa: 9.2,
        activeBacklogs: 0,
        passingYear: 2026,
        phone: '+91 98123 45673',
        skills: ['Machine Learning', 'Python', 'TensorFlow', 'PyTorch', 'Pandas', 'SQL'],
        resumeUrl: 'https://example.com/resumes/sneha_kulkarni_resume.pdf',
      },
      {
        name: 'Arjun Patel',
        email: 'arjun.ece@college.edu',
        password: 'Student@123',
        role: 'student',
        rollNo: '22EC112',
        branch: 'ECE',
        cgpa: 6.4,
        activeBacklogs: 1,
        passingYear: 2026,
        phone: '+91 98123 45674',
        skills: ['Embedded C', 'IoT', 'Python', 'VLSI', 'Microcontrollers'],
        resumeUrl: 'https://example.com/resumes/arjun_patel_resume.pdf',
      },
      {
        name: 'Vikram Singh',
        email: 'vikram.mech@college.edu',
        password: 'Student@123',
        role: 'student',
        rollNo: '22ME119',
        branch: 'MECH',
        cgpa: 7.1,
        activeBacklogs: 0,
        passingYear: 2026,
        phone: '+91 98123 45675',
        skills: ['AutoCAD', 'SolidWorks', 'Python', 'Matlab', 'Thermodynamics'],
        resumeUrl: 'https://example.com/resumes/vikram_singh_resume.pdf',
      },
    ]);

    console.log(`[Seeder] Created 1 Officer and ${students.length} Students.`);

    // 3. Create Companies
    const companies = await Company.create([
      {
        name: 'Google India',
        industry: 'Product & Cloud',
        website: 'https://careers.google.com',
        location: 'Bangalore / Hyderabad',
        description:
          'Google is a global technology leader focused on improving the ways people connect with information, building products like Search, Maps, Cloud, Android, and AI.',
        contactEmail: 'campus-recruitment@google.com',
        contactPerson: 'Aditi Rao (Senior Campus Recruiter)',
        logoUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=120&auto=format&fit=crop&q=80',
      },
      {
        name: 'Microsoft IDC',
        industry: 'Software & Cloud',
        website: 'https://careers.microsoft.com',
        location: 'Hyderabad / Noida',
        description:
          'Microsoft Corporation enables digital transformation for the era of an intelligent cloud and an intelligent edge. Building Azure, Windows, Office 365, and Copilot.',
        contactEmail: 'university_hiring@microsoft.com',
        contactPerson: 'Siddharth Saxena (University Relations Lead)',
        logoUrl: 'https://images.unsplash.com/photo-1642132652075-2b23a5e8e7c1?w=120&auto=format&fit=crop&q=80',
      },
      {
        name: 'Amazon India',
        industry: 'E-Commerce & AWS',
        website: 'https://amazon.jobs',
        location: 'Bangalore / Chennai',
        description:
          'Amazon is guided by four principles: customer obsession rather than competitor focus, passion for invention, commitment to operational excellence, and long-term thinking.',
        contactEmail: 'aws-campus-india@amazon.com',
        contactPerson: 'Karan Mehra (Talent Acquisition Specialist)',
        logoUrl: 'https://images.unsplash.com/photo-1523474253246-72dc9426f6da?w=120&auto=format&fit=crop&q=80',
      },
      {
        name: 'Cisco Systems',
        industry: 'Networking & Security',
        website: 'https://jobs.cisco.com',
        location: 'Bangalore',
        description:
          'Cisco is the worldwide leader in technology that powers the Internet, cybersecurity, software-defined networking, collaboration tools, and cloud infrastructure.',
        contactEmail: 'india-recruitment@cisco.com',
        contactPerson: 'Deepa Menon (Campus HR Manager)',
        logoUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=120&auto=format&fit=crop&q=80',
      },
      {
        name: 'Deloitte India',
        industry: 'Consulting & Advisory',
        website: 'https://deloitte.com/in',
        location: 'Hyderabad / Mumbai',
        description:
          'Deloitte provides audit & assurance, consulting, financial advisory, risk advisory, and tax services to select clients across global enterprise domains.',
        contactEmail: 'campus_deloitte@deloitte.com',
        contactPerson: 'Rohit Joshi (Lead Campus HR)',
        logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&auto=format&fit=crop&q=80',
      },
      {
        name: 'Tata Consultancy Services',
        industry: 'IT Services & Consulting',
        website: 'https://tcs.com/careers',
        location: 'Pan India (Mumbai / Pune / Chennai)',
        description:
          'Tata Consultancy Services is an IT services, consulting, and business solutions organization that has been partnering with many of the worlds largest businesses.',
        contactEmail: 'campus.hiring@tcs.com',
        contactPerson: 'Ananya Deshmukh (Regional Campus Head)',
        logoUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=120&auto=format&fit=crop&q=80',
      },
    ]);

    console.log(`[Seeder] Created ${companies.length} Companies.`);

    // 4. Create Placement Drives
    const now = new Date();
    const addDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const drives = await PlacementDrive.create([
      {
        company: companies[0]._id, // Google
        title: 'Software Development Engineer - 1 (SDE-1)',
        jobRole: 'Software Engineer',
        jobDescription:
          'Looking for strong programmers with sound algorithmic problem solving, object-oriented design, distributed systems, and collaborative development skills.',
        packageCTC: '28 LPA',
        location: 'Bangalore',
        eligibility: {
          minCGPA: 8.0,
          allowedBranches: ['CSE', 'IT', 'AI&DS'],
          maxBacklogs: 0,
          passingYear: 2026,
        },
        driveDate: addDays(14),
        deadline: addDays(7),
        status: 'Upcoming',
        rounds: [
          'Online Coding Challenge (LeetCode Hard/Medium)',
          'Technical Round 1 (Data Structures & Algorithms)',
          'Technical Round 2 (System Design Basics & OS)',
          'Googlyness & Leadership Interview',
        ],
        createdBy: officer._id,
      },
      {
        company: companies[1]._id, // Microsoft
        title: 'Associate Software Engineer - Azure & Core',
        jobRole: 'Associate Software Engineer',
        jobDescription:
          'Join our engineering squads building high-scale cloud platforms, distributed storage engines, and intelligent AI tools.',
        packageCTC: '25 LPA',
        location: 'Hyderabad',
        eligibility: {
          minCGPA: 7.5,
          allowedBranches: ['CSE', 'IT', 'ECE', 'AI&DS'],
          maxBacklogs: 0,
          passingYear: 2026,
        },
        driveDate: addDays(10),
        deadline: addDays(4),
        status: 'Ongoing',
        rounds: [
          'Online Assessment (Codility)',
          'Technical Round 1 (Problem Solving & DSA)',
          'Technical Round 2 (Database & Web Technologies)',
          'Managerial & Culture Fit Interview',
        ],
        createdBy: officer._id,
      },
      {
        company: companies[3]._id, // Cisco
        title: 'Network Software & Security Engineer',
        jobRole: 'Software Engineer - Networking',
        jobDescription:
          'Design and implement next-gen cloud networking protocols, VPN security architectures, and automated testing frameworks.',
        packageCTC: '16 LPA',
        location: 'Bangalore',
        eligibility: {
          minCGPA: 7.0,
          allowedBranches: ['CSE', 'IT', 'ECE', 'EEE'],
          maxBacklogs: 0,
          passingYear: 2026,
        },
        driveDate: addDays(8),
        deadline: addDays(3),
        status: 'Ongoing',
        rounds: [
          'Online Assessment (Aptitude & Networking MCQ + Coding)',
          'Technical Round (C/C++, Networking Protocols)',
          'HR & Director Round',
        ],
        createdBy: officer._id,
      },
      {
        company: companies[4]._id, // Deloitte
        title: 'Technology Consultant & Analyst',
        jobRole: 'Technology Analyst',
        jobDescription:
          'Work directly with global enterprise clients to design digital transformation architectures, cloud migration, and ERP modernization.',
        packageCTC: '10 LPA',
        location: 'Hyderabad',
        eligibility: {
          minCGPA: 6.8,
          allowedBranches: ['CSE', 'IT', 'ECE', 'AI&DS'],
          maxBacklogs: 0,
          passingYear: 2026,
        },
        driveDate: addDays(20),
        deadline: addDays(12),
        status: 'Upcoming',
        rounds: [
          'Online Cognitive & Analytical Assessment',
          'Group Discussion / Business Case Presentation',
          'Technical & Behavioral Interview',
        ],
        createdBy: officer._id,
      },
      {
        company: companies[5]._id, // TCS
        title: 'TCS Digital & Prime Cadre Recruitment',
        jobRole: 'Digital Software Engineer',
        jobDescription:
          'Open drive for premier digital innovation roles across Artificial Intelligence, Cloud Infrastructure, Full-Stack Engineering, and IoT.',
        packageCTC: '7.5 LPA',
        location: 'Pan India',
        eligibility: {
          minCGPA: 6.0,
          allowedBranches: ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS'],
          maxBacklogs: 1,
          passingYear: 2026,
        },
        driveDate: addDays(5),
        deadline: addDays(2),
        status: 'Ongoing',
        rounds: [
          'TCS National Qualifier Test (NQT)',
          'Digital Coding Round',
          'Technical & MR Interview',
          'HR Interview',
        ],
        createdBy: officer._id,
      },
    ]);

    console.log(`[Seeder] Created ${drives.length} Placement Drives.`);

    // 5. Create Sample Applications across various statuses
    // Rahul Verma (8.85 CGPA, CSE) -> Applied to Google, Microsoft, Cisco
    // Priya Nair (7.65 CGPA, IT) -> Shortlisted for Microsoft, Applied to Cisco & TCS
    // Sneha Kulkarni (9.20 CGPA, AI&DS) -> Selected for Microsoft, Applied to Google
    // Arjun Patel (6.40 CGPA, ECE, 1 Backlog) -> Applied to TCS
    const applications = await Application.create([
      {
        drive: drives[0]._id, // Google
        student: students[0]._id, // Rahul Verma
        status: 'Applied',
        remarks: 'Candidate profile cleared initial automated screening.',
        appliedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        drive: drives[1]._id, // Microsoft
        student: students[0]._id, // Rahul Verma
        status: 'Shortlisted',
        remarks: 'Cleared Online Assessment with 95% score. Scheduled for Technical Round 1.',
        appliedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        drive: drives[2]._id, // Cisco
        student: students[0]._id, // Rahul Verma
        status: 'Applied',
        remarks: 'Application under technical review.',
        appliedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        drive: drives[1]._id, // Microsoft
        student: students[1]._id, // Priya Nair
        status: 'Technical Round',
        remarks: 'Technical Round 1 completed successfully. Feedback: Strong Java & DB knowledge.',
        appliedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        drive: drives[4]._id, // TCS
        student: students[1]._id, // Priya Nair
        status: 'Applied',
        remarks: 'Application received.',
        appliedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        drive: drives[1]._id, // Microsoft
        student: students[2]._id, // Sneha Kulkarni
        status: 'Selected',
        remarks: 'Congratulations! Selected for Associate Software Engineer at 25 LPA CTC.',
        appliedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        drive: drives[0]._id, // Google
        student: students[2]._id, // Sneha Kulkarni
        status: 'Interview',
        remarks: 'Cleared DSA round. Final Leadership Round scheduled.',
        appliedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        drive: drives[4]._id, // TCS
        student: students[3]._id, // Arjun Patel (Eligible for TCS)
        status: 'Shortlisted',
        remarks: 'Shortlisted for NQT online assessment.',
        appliedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        drive: drives[4]._id, // TCS
        student: students[4]._id, // Vikram Singh (MECH)
        status: 'Selected',
        remarks: 'Selected in TCS Digital Cadre at 7.5 LPA CTC.',
        appliedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    ]);

    console.log(`[Seeder] Created ${applications.length} Sample Applications.`);
    console.log('\n=============================================');
    console.log(' SEED DATA COMPLETED SUCCESSFULLY');
    console.log('=============================================');
    console.log('Placement Officer Login:');
    console.log('  Email:    officer@college.edu');
    console.log('  Password: Officer@123');
    console.log('---------------------------------------------');
    console.log('Student Logins:');
    console.log('  1. Rahul Verma (CSE, 8.85 CGPA):  rahul.cse@college.edu  / Student@123');
    console.log('  2. Priya Nair (IT, 7.65 CGPA):    priya.it@college.edu   / Student@123');
    console.log('  3. Sneha Kulkarni (AI, 9.20 CGPA): sneha.aids@college.edu / Student@123');
    console.log('  4. Arjun Patel (ECE, 6.40 CGPA, 1 Backlog): arjun.ece@college.edu / Student@123');
    console.log('=============================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
