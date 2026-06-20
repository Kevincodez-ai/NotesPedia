import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// POST - Seed database with sample data
export async function POST(request: NextRequest) {
  try {
    // Check if already seeded
    const existingColleges = await db.college.count();
    if (existingColleges > 0) {
      return NextResponse.json({
        success: false,
        error: 'Database already seeded. Clear data first.',
      }, { status: 400 });
    }

    // ============================================================
    // 1. COLLEGES
    // ============================================================
    const colleges = await Promise.all([
      db.college.create({
        data: {
          name: 'Indian Institute of Technology Bombay',
          shortName: 'IIT Bombay',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          type: 'university',
          website: 'https://www.iitb.ac.in',
          isVerified: true,
        },
      }),
      db.college.create({
        data: {
          name: 'All India Institute of Medical Sciences New Delhi',
          shortName: 'AIIMS Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
          type: 'institute',
          website: 'https://www.aiims.edu',
          isVerified: true,
        },
      }),
      db.college.create({
        data: {
          name: 'National Law School of India University',
          shortName: 'NLSIU',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          type: 'university',
          website: 'https://www.nls.ac.in',
          isVerified: true,
        },
      }),
      db.college.create({
        data: {
          name: 'Indian Institute of Technology Delhi',
          shortName: 'IIT Delhi',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
          type: 'university',
          website: 'https://www.iitd.ac.in',
          isVerified: true,
        },
      }),
    ]);

    // ============================================================
    // 2. DEPARTMENTS
    // ============================================================
    const departments = await Promise.all([
      // IIT Bombay departments
      db.department.create({
        data: { name: 'Computer Science & Engineering', code: 'CSE', collegeId: colleges[0].id },
      }),
      db.department.create({
        data: { name: 'Electrical Engineering', code: 'EE', collegeId: colleges[0].id },
      }),
      db.department.create({
        data: { name: 'Mechanical Engineering', code: 'ME', collegeId: colleges[0].id },
      }),
      // AIIMS Delhi departments
      db.department.create({
        data: { name: 'General Medicine', code: 'GM', collegeId: colleges[1].id },
      }),
      db.department.create({
        data: { name: 'Anatomy', code: 'ANAT', collegeId: colleges[1].id },
      }),
      // NLSIU departments
      db.department.create({
        data: { name: 'Constitutional Law', code: 'CL', collegeId: colleges[2].id },
      }),
      // IIT Delhi departments
      db.department.create({
        data: { name: 'Computer Science & Engineering', code: 'CSE', collegeId: colleges[3].id },
      }),
      db.department.create({
        data: { name: 'Mathematics', code: 'MATH', collegeId: colleges[3].id },
      }),
    ]);

    // ============================================================
    // 3. SUBJECTS
    // ============================================================
    const subjects = await Promise.all([
      // CSE subjects (IIT Bombay)
      db.subject.create({
        data: { name: 'Data Structures & Algorithms', code: 'CS201', semester: 3, departmentId: departments[0].id, collegeId: colleges[0].id, description: 'Fundamental data structures and algorithm design techniques' },
      }),
      db.subject.create({
        data: { name: 'Operating Systems', code: 'CS301', semester: 5, departmentId: departments[0].id, collegeId: colleges[0].id, description: 'Process management, memory management, file systems' },
      }),
      db.subject.create({
        data: { name: 'Machine Learning', code: 'CS401', semester: 7, departmentId: departments[0].id, collegeId: colleges[0].id, description: 'Supervised and unsupervised learning, neural networks' },
      }),
      db.subject.create({
        data: { name: 'Database Management Systems', code: 'CS202', semester: 4, departmentId: departments[0].id, collegeId: colleges[0].id, description: 'Relational databases, SQL, normalization, transactions' },
      }),
      // EE subjects
      db.subject.create({
        data: { name: 'Signals & Systems', code: 'EE301', semester: 5, departmentId: departments[1].id, collegeId: colleges[0].id, description: 'Fourier analysis, Laplace transforms, signal processing' },
      }),
      // ME subjects
      db.subject.create({
        data: { name: 'Thermodynamics', code: 'ME201', semester: 3, departmentId: departments[2].id, collegeId: colleges[0].id, description: 'Laws of thermodynamics, entropy, cycles' },
      }),
      // Medical subjects
      db.subject.create({
        data: { name: 'Human Anatomy', code: 'MED101', semester: 1, departmentId: departments[3].id, collegeId: colleges[1].id, description: 'Structure and organization of the human body' },
      }),
      db.subject.create({
        data: { name: 'Pharmacology', code: 'MED301', semester: 5, departmentId: departments[3].id, collegeId: colleges[1].id, description: 'Drug actions, interactions, and therapeutic uses' },
      }),
      db.subject.create({
        data: { name: 'Pathology', code: 'MED201', semester: 3, departmentId: departments[4].id, collegeId: colleges[1].id, description: 'Study of diseases, their causes and effects' },
      }),
      // Law subjects
      db.subject.create({
        data: { name: 'Constitutional Law I', code: 'LAW101', semester: 1, departmentId: departments[5].id, collegeId: colleges[2].id, description: 'Fundamental rights, directive principles, constitutional framework' },
      }),
      db.subject.create({
        data: { name: 'Criminal Law', code: 'LAW201', semester: 3, departmentId: departments[5].id, collegeId: colleges[2].id, description: 'IPC, CrPC, Indian Evidence Act' },
      }),
      // IIT Delhi subjects
      db.subject.create({
        data: { name: 'Artificial Intelligence', code: 'CS501', semester: 7, departmentId: departments[6].id, collegeId: colleges[3].id, description: 'Search algorithms, knowledge representation, NLP' },
      }),
      db.subject.create({
        data: { name: 'Linear Algebra', code: 'MA201', semester: 3, departmentId: departments[7].id, collegeId: colleges[3].id, description: 'Vectors, matrices, eigenvalues, linear transformations' },
      }),
    ]);

    // ============================================================
    // 4. USERS
    // ============================================================
    const passwordHash = await hashPassword('password123');

    const users = await Promise.all([
      db.user.create({
        data: {
          name: 'Arjun Sharma',
          email: 'arjun@iitb.ac.in',
          passwordHash,
          role: 'contributor',
          bio: 'CS enthusiast at IIT Bombay. Love sharing study materials!',
          provider: 'email',
          profile: {
            create: {
              collegeId: colleges[0].id,
              departmentId: departments[0].id,
              semester: 6,
              year: 3,
              contributionScore: 85,
              reputationScore: 120,
              uploadCount: 12,
              downloadCount: 45,
              followerCount: 34,
              followingCount: 15,
              noteCount: 10,
            },
          },
        },
      }),
      db.user.create({
        data: {
          name: 'Priya Patel',
          email: 'priya@aiims.edu',
          passwordHash,
          role: 'verified_student',
          bio: 'Medical student at AIIMS Delhi. Passionate about anatomy and physiology.',
          provider: 'email',
          profile: {
            create: {
              collegeId: colleges[1].id,
              departmentId: departments[3].id,
              semester: 4,
              year: 2,
              contributionScore: 55,
              reputationScore: 78,
              uploadCount: 6,
              downloadCount: 30,
              followerCount: 22,
              followingCount: 10,
              noteCount: 5,
            },
          },
        },
      }),
      db.user.create({
        data: {
          name: 'Rahul Krishnan',
          email: 'rahul@nlsiu.ac.in',
          passwordHash,
          role: 'student',
          bio: 'Law student at NLSIU Bengaluru. Focused on constitutional law.',
          provider: 'email',
          profile: {
            create: {
              collegeId: colleges[2].id,
              departmentId: departments[5].id,
              semester: 3,
              year: 2,
              contributionScore: 30,
              reputationScore: 45,
              uploadCount: 4,
              downloadCount: 20,
              followerCount: 12,
              followingCount: 8,
              noteCount: 3,
            },
          },
        },
      }),
      db.user.create({
        data: {
          name: 'Sneha Reddy',
          email: 'sneha@iitd.ac.in',
          passwordHash,
          role: 'contributor',
          bio: 'AI researcher at IIT Delhi. Machine learning and deep learning enthusiast.',
          provider: 'email',
          profile: {
            create: {
              collegeId: colleges[3].id,
              departmentId: departments[6].id,
              semester: 7,
              year: 4,
              contributionScore: 95,
              reputationScore: 150,
              uploadCount: 15,
              downloadCount: 60,
              followerCount: 48,
              followingCount: 20,
              noteCount: 12,
            },
          },
        },
      }),
      db.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@notespedia.in',
          passwordHash,
          role: 'admin',
          bio: 'NotesPedia platform administrator',
          provider: 'email',
          profile: {
            create: {
              contributionScore: 200,
              reputationScore: 300,
              uploadCount: 0,
              downloadCount: 0,
              followerCount: 100,
              followingCount: 0,
              noteCount: 0,
            },
          },
        },
      }),
    ]);

    // ============================================================
    // 5. NOTES
    // ============================================================
    const noteData = [
      {
        title: 'Complete DSA Notes - Trees & Graphs',
        description: 'Comprehensive notes covering binary trees, BST, AVL trees, graph traversal (BFS/DFS), and shortest path algorithms.',
        extractedText: 'Binary Trees: A binary tree is a hierarchical data structure where each node has at most two children, referred to as left and right child. Types of binary trees include full binary tree, complete binary tree, and perfect binary tree.\n\nGraph Traversal: BFS (Breadth-First Search) explores all neighbors at the current depth before moving to the next level. It uses a queue data structure and is optimal for finding shortest paths in unweighted graphs. DFS (Depth-First Search) explores as far as possible along each branch before backtracking. It uses a stack or recursion and is useful for topological sorting and detecting cycles.\n\nDijkstra\'s Algorithm: Finds the shortest path from a source to all other vertices in a weighted graph with non-negative weights. Time complexity is O(V²) with adjacency matrix and O((V+E)logV) with min-heap.',
        subjectId: subjects[0].id, collegeId: colleges[0].id, departmentId: departments[0].id, semester: 3,
        uploaderId: users[0].id, fileType: 'pdf', fileSize: 2400000, downloadCount: 156, viewCount: 890, bookmarkCount: 45, avgRating: 4.5, ratingCount: 23,
      },
      {
        title: 'Operating Systems - Process Synchronization',
        description: 'Detailed notes on process synchronization, semaphores, mutex, deadlock handling, and classical synchronization problems.',
        extractedText: 'Process Synchronization: Coordination of execution of multiple processes to ensure data consistency when processes share resources. Critical section problem requires mutual exclusion, progress, and bounded waiting.\n\nSemaphores: A synchronization primitive that controls access to shared resources. Counting semaphores can have any non-negative value, while binary semaphores (mutex) have values 0 or 1. Wait(P) operation decrements the value, and Signal(V) operation increments it.\n\nDeadlock: A condition where two or more processes are unable to proceed because each is waiting for the other to release a resource. Four necessary conditions: mutual exclusion, hold and wait, no preemption, circular wait. Prevention strategies include eliminating one of the four conditions.',
        subjectId: subjects[1].id, collegeId: colleges[0].id, departmentId: departments[0].id, semester: 5,
        uploaderId: users[0].id, fileType: 'pdf', fileSize: 1800000, downloadCount: 98, viewCount: 456, bookmarkCount: 32, avgRating: 4.2, ratingCount: 15,
      },
      {
        title: 'Machine Learning Fundamentals',
        description: 'Intro to ML: regression, classification, clustering, neural networks basics with Python examples.',
        extractedText: 'Supervised Learning: The algorithm learns from labeled training data to make predictions. Regression predicts continuous values (e.g., house prices), while classification predicts discrete categories (e.g., spam/not spam). Linear regression minimizes the sum of squared errors. Logistic regression uses the sigmoid function to output probabilities.\n\nUnsupervised Learning: Finds patterns in unlabeled data. K-means clustering partitions data into K clusters by minimizing within-cluster variance. Hierarchical clustering builds a tree of clusters. PCA reduces dimensionality while preserving variance.\n\nNeural Networks: Composed of layers of interconnected neurons. Each neuron computes weighted sum of inputs plus bias, applies activation function (ReLU, sigmoid, tanh). Backpropagation computes gradients for weight updates using chain rule.',
        subjectId: subjects[2].id, collegeId: colleges[0].id, departmentId: departments[0].id, semester: 7,
        uploaderId: users[3].id, fileType: 'pdf', fileSize: 3200000, downloadCount: 234, viewCount: 1200, bookmarkCount: 67, avgRating: 4.8, ratingCount: 42,
      },
      {
        title: 'DBMS - Normalization & Transaction Management',
        description: 'Complete guide to database normalization (1NF to BCNF) and ACID properties with examples.',
        extractedText: 'Normalization: Process of organizing database to reduce redundancy and improve data integrity. First Normal Form (1NF) eliminates repeating groups. Second Normal Form (2NF) removes partial dependencies. Third Normal Form (3NF) eliminates transitive dependencies. BCNF is a stricter version of 3NF where every determinant is a candidate key.\n\nACID Properties: Atomicity ensures all or nothing execution. Consistency maintains database integrity constraints. Isolation ensures concurrent transactions don\'t interfere. Durability guarantees committed transactions persist even after failures.\n\nTwo-Phase Locking: A concurrency control protocol. Growing phase acquires locks, shrinking phase releases locks. Prevents conflicts but can cause deadlocks.',
        subjectId: subjects[3].id, collegeId: colleges[0].id, departmentId: departments[0].id, semester: 4,
        uploaderId: users[0].id, fileType: 'docx', fileSize: 1500000, downloadCount: 67, viewCount: 345, bookmarkCount: 21, avgRating: 4.0, ratingCount: 10,
      },
      {
        title: 'Signals & Systems - Fourier Analysis',
        description: 'Fourier series, Fourier transform, properties, and applications in signal processing.',
        extractedText: 'Fourier Series: Any periodic signal can be expressed as a sum of sinusoids. x(t) = a₀ + Σ[aₙcos(nω₀t) + bₙsin(nω₀t)]. Coefficients are computed using orthogonality of sinusoids. Convergence requires Dirichlet conditions.\n\nFourier Transform: Extends Fourier series to non-periodic signals. X(jω) = ∫x(t)e^(-jωt)dt. Converts time-domain signals to frequency-domain representation. Key properties: linearity, time-shifting, frequency-shifting, convolution, and Parseval\'s theorem.\n\nApplications: Filtering, spectral analysis, modulation, image processing. FFT (Fast Fourier Transform) reduces computation from O(N²) to O(NlogN).',
        subjectId: subjects[4].id, collegeId: colleges[0].id, departmentId: departments[1].id, semester: 5,
        uploaderId: users[0].id, fileType: 'pdf', fileSize: 2800000, downloadCount: 45, viewCount: 210, bookmarkCount: 15, avgRating: 3.8, ratingCount: 8,
      },
      {
        title: 'Thermodynamics - First & Second Law',
        description: 'Comprehensive coverage of thermodynamic laws, entropy, and thermodynamic cycles.',
        extractedText: 'First Law of Thermodynamics: Energy cannot be created or destroyed, only converted from one form to another. For a closed system: Q = ΔU + W. Internal energy is a state function, while heat and work are path functions.\n\nSecond Law of Thermodynamics: Kelvin-Planck statement - no heat engine can convert all heat to work. Clausius statement - heat cannot flow from cold to hot without external work. Entropy is a measure of disorder. For reversible processes: ΔS = Q/T. For irreversible processes: ΔS > Q/T.\n\nCarnot Cycle: Most efficient heat engine operating between two temperatures. Efficiency = 1 - T_cold/T_hot. Consists of two isothermal and two adiabatic processes.',
        subjectId: subjects[5].id, collegeId: colleges[0].id, departmentId: departments[2].id, semester: 3,
        uploaderId: users[0].id, fileType: 'txt', fileSize: 45000, downloadCount: 34, viewCount: 178, bookmarkCount: 12, avgRating: 3.5, ratingCount: 6,
      },
      {
        title: 'Human Anatomy - Musculoskeletal System',
        description: 'Detailed notes on bones, joints, muscles, and their clinical correlations.',
        extractedText: 'Skeletal System: The human skeleton consists of 206 bones. Axial skeleton includes skull, vertebral column, and rib cage (80 bones). Appendicular skeleton includes limbs and girdles (126 bones). Bones are classified by shape: long, short, flat, irregular, and sesamoid.\n\nJoints: Classified structurally as fibrous, cartilaginous, or synovial. Synovial joints are the most common and mobile type. Types include hinge (elbow), pivot (atlantoaxial), ball-and-socket (hip), saddle (CMC of thumb), and plane (intercarpal).\n\nMuscular System: Three types - skeletal (voluntary), smooth (involuntary), cardiac (involuntary, striated). Skeletal muscles attach via tendons. Contraction types: isotonic (concentric/eccentric) and isometric. Motor unit = one motor neuron + all muscle fibers it innervates.',
        subjectId: subjects[6].id, collegeId: colleges[1].id, departmentId: departments[3].id, semester: 1,
        uploaderId: users[1].id, fileType: 'pdf', fileSize: 5600000, downloadCount: 189, viewCount: 920, bookmarkCount: 56, avgRating: 4.6, ratingCount: 28,
      },
      {
        title: 'Pharmacology - Drug Receptors & Mechanisms',
        description: 'Notes on drug-receptor interactions, dose-response relationships, and pharmacokinetics.',
        extractedText: 'Drug-Receptor Interactions: Drugs bind to specific receptors to produce effects. Agonists activate receptors, antagonists block them. Affinity is the strength of drug-receptor binding. Efficacy is the ability to produce a response. Competitive antagonists can be overcome by increasing agonist concentration (parallel right shift of dose-response curve).\n\nPharmacokinetics: What the body does to the drug. ADME - Absorption, Distribution, Metabolism, Excretion. Bioavailability is the fraction of drug reaching systemic circulation. First-pass metabolism in liver reduces bioavailability of orally administered drugs. Half-life (t₁/₂) determines dosing interval. Volume of distribution relates drug dose to plasma concentration.\n\nDrug Interactions: Pharmacokinetic interactions affect ADME. Pharmacodynamic interactions are at receptor level. Synergism: combined effect greater than sum. Potentiation: one drug enhances effect of another.',
        subjectId: subjects[7].id, collegeId: colleges[1].id, departmentId: departments[3].id, semester: 5,
        uploaderId: users[1].id, fileType: 'pdf', fileSize: 3400000, downloadCount: 112, viewCount: 567, bookmarkCount: 38, avgRating: 4.3, ratingCount: 18,
      },
      {
        title: 'Pathology - Cell Injury & Inflammation',
        description: 'Notes covering causes of cell injury, necrosis, apoptosis, and inflammatory responses.',
        extractedText: 'Cell Injury: Causes include hypoxia, toxins, infections, immunologic reactions, genetic defects, nutritional imbalances. Reversible injury shows cellular swelling and fatty change. Irreversible injury leads to necrosis or apoptosis.\n\nNecrosis vs Apoptosis: Necrosis is pathological, involves cell swelling, membrane rupture, and inflammation. Types: coagulative (most common, preserves tissue architecture), liquefactive (brain abscesses), caseous (tuberculosis), fat (pancreatitis), gangrenous. Apoptosis is programmed cell death, involves cell shrinkage, chromatin condensation, apoptotic bodies, no inflammation.\n\nInflammation: Acute inflammation - vascular response (vasodilation, increased permeability), cellular response (neutrophil migration). Chronic inflammation - lymphocytes, macrophages, fibrosis. Mediators: histamine, prostaglandins, leukotrienes, cytokines (IL-1, TNF-α).',
        subjectId: subjects[8].id, collegeId: colleges[1].id, departmentId: departments[4].id, semester: 3,
        uploaderId: users[1].id, fileType: 'pdf', fileSize: 2900000, downloadCount: 87, viewCount: 432, bookmarkCount: 28, avgRating: 4.1, ratingCount: 14,
      },
      {
        title: 'Constitutional Law - Fundamental Rights',
        description: 'Comprehensive analysis of Part III of the Indian Constitution - all fundamental rights explained.',
        extractedText: 'Fundamental Rights (Part III, Articles 12-35): These are justiciable rights enforceable against the State. Article 12 defines State broadly to include government, parliament, local authorities, and statutory bodies.\n\nRight to Equality (Art 14-18): Art 14 - Equality before law and equal protection. Art 15 - Prohibition of discrimination on grounds of religion, race, caste, sex, place of birth. Art 16 - Equality of opportunity in public employment. Art 17 - Abolition of untouchability. Art 18 - Abolition of titles.\n\nRight to Freedom (Art 19-22): Art 19 guarantees six freedoms - speech, assembly, association, movement, residence, profession. Each is subject to reasonable restrictions. Art 21 - Right to life and personal liberty (expanded by judiciary to include right to privacy, education, health, etc.). Art 21A - Right to education (6-14 years).',
        subjectId: subjects[9].id, collegeId: colleges[2].id, departmentId: departments[5].id, semester: 1,
        uploaderId: users[2].id, fileType: 'pdf', fileSize: 2100000, downloadCount: 145, viewCount: 734, bookmarkCount: 42, avgRating: 4.4, ratingCount: 20,
      },
      {
        title: 'Criminal Law - Indian Penal Code Essentials',
        description: 'Key provisions of IPC covering offenses against person, property, and state.',
        extractedText: 'Indian Penal Code (IPC) 1860: Substantive criminal law of India. Applies to all Indian citizens. Section 34 - Common intention. Section 120A/B - Criminal conspiracy.\n\nOffenses Against Person: Section 299-300 - Culpable homicide and murder (difference lies in intention and knowledge). Section 304 - Dowry death. Section 304A - Death by negligence. Section 307 - Attempt to murder. Section 319-338 - Hurt, grievous hurt. Section 354 - Assault or criminal force to woman with intent to outrage modesty. Section 375/376 - Rape (redefined after 2013 amendment and 2018 ordinance).\n\nOffenses Against Property: Section 378-382 - Theft. Section 390-402 - Robbery and dacoity. Section 403-404 - Criminal misappropriation. Section 405-409 - Criminal breach of trust. Section 415-420 - Cheating. Section 425-432 - Mischief.',
        subjectId: subjects[10].id, collegeId: colleges[2].id, departmentId: departments[5].id, semester: 3,
        uploaderId: users[2].id, fileType: 'docx', fileSize: 1800000, downloadCount: 98, viewCount: 512, bookmarkCount: 31, avgRating: 4.0, ratingCount: 12,
      },
      {
        title: 'AI - Search Algorithms & Knowledge Representation',
        description: 'Notes on uninformed and informed search strategies, heuristic functions, and knowledge representation methods.',
        extractedText: 'Uninformed Search: BFS, DFS, Uniform Cost Search, Depth-Limited Search, Iterative Deepening. No heuristic information used. BFS is complete and optimal (unit cost). DFS is neither complete nor optimal.\n\nInformed Search: Uses heuristic function h(n) to estimate cost from n to goal. Greedy Best-First Search uses only h(n). A* Search uses f(n) = g(n) + h(n) where g(n) is cost from start. A* is optimal if h(n) is admissible (never overestimates). IDA* uses iterative deepening with A*.\n\nKnowledge Representation: Propositional logic (simple but limited expressiveness). First-Order Logic (quantifiers, predicates, functions). Semantic Networks (graph-based representation). Frames (structured objects with slots and fillers). Ontologies for shared understanding. Production rules (IF-THEN).',
        subjectId: subjects[11].id, collegeId: colleges[3].id, departmentId: departments[6].id, semester: 7,
        uploaderId: users[3].id, fileType: 'pdf', fileSize: 2700000, downloadCount: 178, viewCount: 890, bookmarkCount: 52, avgRating: 4.7, ratingCount: 35,
      },
      {
        title: 'Linear Algebra - Matrices & Eigenvalues',
        description: 'Complete coverage of matrix operations, determinants, eigenvalues, eigenvectors, and applications.',
        extractedText: 'Matrix Operations: Addition (element-wise, same dimensions). Multiplication (inner dimensions must match). Transpose (rows become columns). Inverse exists for square non-singular matrices. Properties: (AB)ᵀ = BᵀAᵀ, (AB)⁻¹ = B⁻¹A⁻¹.\n\nDeterminants: Scalar value for square matrices. |A| ≠ 0 means invertible. Cofactor expansion along any row or column. Properties: |AB| = |A||B|, |Aᵀ| = |A|, |kA| = kⁿ|A| for n×n matrix.\n\nEigenvalues & Eigenvectors: Av = λv where λ is eigenvalue, v is eigenvector. Find by solving |A - λI| = 0 (characteristic equation). Eigenvectors corresponding to distinct eigenvalues are linearly independent. Diagonalization: A = PDP⁻¹ where D is diagonal matrix of eigenvalues. Applications: differential equations, principal component analysis, Google PageRank.',
        subjectId: subjects[12].id, collegeId: colleges[3].id, departmentId: departments[7].id, semester: 3,
        uploaderId: users[3].id, fileType: 'pdf', fileSize: 1900000, downloadCount: 134, viewCount: 678, bookmarkCount: 39, avgRating: 4.4, ratingCount: 22,
      },
      {
        title: 'Deep Learning - CNNs and RNNs',
        description: 'Notes on convolutional neural networks, recurrent neural networks, and their applications.',
        extractedText: 'Convolutional Neural Networks (CNNs): Designed for grid-like data (images). Key layers: Convolution (feature extraction with learnable filters), Pooling (dimensionality reduction - max/average), Fully Connected (classification). Popular architectures: LeNet, AlexNet, VGGNet, ResNet (skip connections solve vanishing gradient), Inception (multi-scale features).\n\nRecurrent Neural Networks (RNNs): Designed for sequential data. Hidden state carries information from previous time steps. Problem: vanishing/exploding gradients. Solutions: LSTM (Long Short-Term Memory) with gates (forget, input, output), GRU (simpler than LSTM with reset and update gates). Bidirectional RNNs process sequences in both directions.\n\nApplications: CNNs - image classification, object detection (YOLO, SSD), segmentation (U-Net), style transfer. RNNs - language modeling, machine translation (seq2seq with attention), speech recognition, text generation.',
        subjectId: subjects[2].id, collegeId: colleges[3].id, departmentId: departments[6].id, semester: 7,
        uploaderId: users[3].id, fileType: 'pdf', fileSize: 4100000, downloadCount: 256, viewCount: 1450, bookmarkCount: 78, avgRating: 4.9, ratingCount: 48,
      },
      {
        title: 'Python Programming for Data Science',
        description: 'Essential Python libraries for data science: NumPy, Pandas, Matplotlib, Scikit-learn.',
        extractedText: 'NumPy: Fundamental package for numerical computing. N-dimensional array object (ndarray). Vectorized operations (element-wise computation without loops). Broadcasting for operations on different-shaped arrays. Linear algebra: np.dot(), np.linalg.inv(), np.linalg.eig(). Random number generation.\n\nPandas: Data manipulation and analysis. DataFrame (2D labeled data structure) and Series (1D). Operations: filtering, grouping (groupby), merging (merge/join), reshaping (pivot/melt). Handling missing data: fillna(), dropna(). Time series: date_range, resample, rolling windows.\n\nMatplotlib & Seaborn: Data visualization. Line plots, bar charts, histograms, scatter plots, heatmaps. Customization: titles, labels, legends, subplots. Seaborn provides statistical visualization and attractive defaults.\n\nScikit-learn: Machine learning library. Unified API: fit(), predict(), transform(). Algorithms: LinearRegression, LogisticRegression, RandomForest, SVM, KMeans. Tools: train_test_split, cross_val_score, GridSearchCV, Pipeline.',
        subjectId: subjects[2].id, collegeId: colleges[0].id, departmentId: departments[0].id, semester: 5,
        uploaderId: users[0].id, fileType: 'pdf', fileSize: 2200000, downloadCount: 312, viewCount: 1560, bookmarkCount: 89, avgRating: 4.6, ratingCount: 38,
      },
      {
        title: 'Computer Networks - TCP/IP & OSI Model',
        description: 'Detailed comparison of TCP/IP and OSI models, protocols at each layer, and networking fundamentals.',
        extractedText: 'OSI Model (7 layers): Physical (bit transmission), Data Link (framing, error detection - Ethernet, PPP), Network (routing - IP, ICMP), Transport (end-to-end - TCP, UDP), Session (dialog control), Presentation (data format, encryption), Application (user interface - HTTP, FTP, SMTP).\n\nTCP/IP Model (4 layers): Link, Internet, Transport, Application. TCP: connection-oriented, reliable, flow control (sliding window), congestion control (slow start, AIMD). Three-way handshake: SYN, SYN-ACK, ACK. UDP: connectionless, unreliable, low overhead, used for streaming, DNS.\n\nIP Addressing: IPv4 (32-bit, dotted decimal). Classes A-E. Subnetting with CIDR. NAT for address translation. IPv6 (128-bit, colon-hex). DHCP for automatic IP assignment. DNS resolves domain names to IP addresses. ARP resolves IP to MAC address.',
        subjectId: subjects[1].id, collegeId: colleges[0].id, departmentId: departments[0].id, semester: 5,
        uploaderId: users[0].id, fileType: 'pptx', fileSize: 5800000, downloadCount: 78, viewCount: 390, bookmarkCount: 25, avgRating: 3.9, ratingCount: 11,
      },
      {
        title: 'Medical Physiology - Cardiovascular System',
        description: 'Complete notes on heart anatomy, cardiac cycle, blood pressure regulation, and common cardiovascular disorders.',
        extractedText: 'Heart Anatomy: Four chambers - right atrium, right ventricle, left atrium, left ventricle. Valves: tricuspid, pulmonary, mitral (bicuspid), aortic. Coronary circulation: left and right coronary arteries. Conduction system: SA node (pacemaker, 60-100 bpm), AV node (delay), Bundle of His, Purkinje fibers.\n\nCardiac Cycle: Atrial systole, isovolumetric contraction, ventricular ejection, isovolumetric relaxation, ventricular filling. Cardiac output = Heart rate × Stroke volume (normally ~5 L/min). Frank-Starling mechanism: increased preload increases stroke volume.\n\nBlood Pressure Regulation: Short-term - baroreceptor reflex, chemoreceptor reflex. Long-term - renin-angiotensin-aldosterone system (RAAS), ADH, atrial natriuretic peptide. Hypertension: sustained BP > 140/90 mmHg. Risk factors: obesity, salt intake, stress, genetics.',
        subjectId: subjects[6].id, collegeId: colleges[1].id, departmentId: departments[3].id, semester: 2,
        uploaderId: users[1].id, fileType: 'pdf', fileSize: 3800000, downloadCount: 143, viewCount: 710, bookmarkCount: 47, avgRating: 4.5, ratingCount: 25,
      },
      {
        title: 'Legal Research Methodology',
        description: 'Guide to legal research methods, citation formats, and case analysis techniques.',
        extractedText: 'Legal Research Process: Identify the legal issue, determine jurisdiction, find relevant statutes and case law, analyze and synthesize sources, present findings. Primary sources: statutes, case law, regulations. Secondary sources: textbooks, journal articles, commentaries, digests.\n\nCase Analysis Method: IRAC - Issue, Rule, Application, Conclusion. Identify the legal question, state the relevant legal rule, apply the rule to the facts, reach a conclusion. Distinguish between ratio decidendi (binding) and obiter dicta (persuasive).\n\nCitation Format: Case citation - Party v. Party, Volume Reporter Page (Court Year). e.g., Kesavananda Bharati v. State of Kerala, AIR 1973 SC 1461. Statute citation - Short Title, Year, Section number. e.g., Constitution of India, 1950, Art. 21. Use SCC, AIR, SCALE for Indian case law.',
        subjectId: subjects[9].id, collegeId: colleges[2].id, departmentId: departments[5].id, semester: 2,
        uploaderId: users[2].id, fileType: 'pdf', fileSize: 1600000, downloadCount: 56, viewCount: 289, bookmarkCount: 18, avgRating: 3.7, ratingCount: 7,
      },
      {
        title: 'Software Engineering - Agile & Design Patterns',
        description: 'Notes on agile methodologies, Scrum framework, and common software design patterns.',
        extractedText: 'Agile Methodology: Iterative and incremental development. Values: individuals over processes, working software over documentation, customer collaboration over negotiation, responding to change over following a plan. Scrum: Product Owner, Scrum Master, Development Team. Artifacts: Product Backlog, Sprint Backlog, Increment. Events: Sprint Planning, Daily Standup, Sprint Review, Sprint Retrospective.\n\nDesign Patterns: Creational - Singleton (one instance), Factory (object creation), Builder (complex object step-by-step). Structural - Adapter (interface compatibility), Decorator (add behavior dynamically), Facade (simplified interface). Behavioral - Observer (pub-sub), Strategy (interchangeable algorithms), Command (encapsulate request). SOLID principles: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.',
        subjectId: subjects[3].id, collegeId: colleges[3].id, departmentId: departments[6].id, semester: 6,
        uploaderId: users[3].id, fileType: 'pdf', fileSize: 2400000, downloadCount: 167, viewCount: 823, bookmarkCount: 55, avgRating: 4.3, ratingCount: 19,
      },
    ];

    const notes = await Promise.all(
      noteData.map((data) =>
        db.note.create({
          data: {
            ...data,
            status: 'active',
            isPublic: true,
            qualityScore: data.avgRating * 20, // Simple quality score
          },
        })
      )
    );

    // ============================================================
    // 6. ADDITIONAL DATA - Tags, Achievements, Study Groups
    // ============================================================

    // Add tags to notes
    const tagMap: Record<number, string[]> = {
      0: ['dsa', 'trees', 'graphs', 'algorithms'],
      1: ['os', 'synchronization', 'deadlock'],
      2: ['ml', 'neural-networks', 'python'],
      3: ['dbms', 'sql', 'normalization'],
      4: ['signals', 'fourier', 'dsp'],
      5: ['thermodynamics', 'physics', 'engineering'],
      6: ['anatomy', 'medical', 'musculoskeletal'],
      7: ['pharmacology', 'drugs', 'medical'],
      8: ['pathology', 'cell-injury', 'inflammation'],
      9: ['constitutional-law', 'fundamental-rights', 'indian-constitution'],
      10: ['criminal-law', 'ipc', 'legal'],
      11: ['ai', 'search-algorithms', 'knowledge-representation'],
      12: ['linear-algebra', 'matrices', 'eigenvalues'],
      13: ['deep-learning', 'cnn', 'rnn'],
      14: ['python', 'data-science', 'numpy'],
      15: ['computer-networks', 'tcp-ip', 'osi'],
      16: ['physiology', 'cardiovascular', 'medical'],
      17: ['legal-research', 'methodology', 'citation'],
      18: ['software-engineering', 'agile', 'design-patterns'],
    };

    const tagPromises: Promise<unknown>[] = [];
    for (const [index, tags] of Object.entries(tagMap)) {
      const noteId = notes[parseInt(index)]?.id;
      if (noteId) {
        tags.forEach((tag) => {
          tagPromises.push(
            db.noteTag.create({ data: { noteId, tag } })
          );
        });
      }
    }
    await Promise.all(tagPromises);

    // Create achievements
    const achievements = await Promise.all([
      db.achievement.create({
        data: { name: 'First Upload', description: 'Upload your first note', icon: '📝', category: 'upload', threshold: 1 },
      }),
      db.achievement.create({
        data: { name: 'Prolific Author', description: 'Upload 10 notes', icon: '📚', category: 'upload', threshold: 10 },
      }),
      db.achievement.create({
        data: { name: 'Helpful Contributor', description: 'Receive 50 downloads', icon: '🌟', category: 'social', threshold: 50 },
      }),
      db.achievement.create({
        data: { name: 'Rising Star', description: 'Reach 100 reputation', icon: '⭐', category: 'academic', threshold: 100 },
      }),
      db.achievement.create({
        data: { name: 'Community Leader', description: 'Get 25 followers', icon: '👥', category: 'social', threshold: 25 },
      }),
    ]);

    // Assign some achievements to users
    await Promise.all([
      db.userAchievement.create({ data: { userId: users[0].id, achievementId: achievements[0].id } }),
      db.userAchievement.create({ data: { userId: users[0].id, achievementId: achievements[1].id } }),
      db.userAchievement.create({ data: { userId: users[0].id, achievementId: achievements[3].id } }),
      db.userAchievement.create({ data: { userId: users[3].id, achievementId: achievements[0].id } }),
      db.userAchievement.create({ data: { userId: users[3].id, achievementId: achievements[1].id } }),
      db.userAchievement.create({ data: { userId: users[3].id, achievementId: achievements[2].id } }),
      db.userAchievement.create({ data: { userId: users[3].id, achievementId: achievements[3].id } }),
      db.userAchievement.create({ data: { userId: users[1].id, achievementId: achievements[0].id } }),
      db.userAchievement.create({ data: { userId: users[1].id, achievementId: achievements[4].id } }),
    ]);

    // Create study groups
    await Promise.all([
      db.studyGroup.create({
        data: {
          name: 'DSA Preparation Group',
          description: 'Weekly problem-solving sessions for Data Structures & Algorithms',
          subjectId: subjects[0].id,
          collegeId: colleges[0].id,
          creatorId: users[0].id,
          isPublic: true,
          memberCount: 3,
          members: {
            create: [
              { userId: users[0].id, role: 'admin' },
              { userId: users[3].id, role: 'member' },
            ],
          },
        },
      }),
      db.studyGroup.create({
        data: {
          name: 'Medical Board Prep',
          description: 'Collaborative study group for medical board exam preparation',
          subjectId: subjects[6].id,
          collegeId: colleges[1].id,
          creatorId: users[1].id,
          isPublic: true,
          memberCount: 2,
          members: {
            create: [
              { userId: users[1].id, role: 'admin' },
            ],
          },
        },
      }),
      db.studyGroup.create({
        data: {
          name: 'ML/AI Research Circle',
          description: 'Deep learning and AI research discussion group',
          subjectId: subjects[2].id,
          collegeId: colleges[3].id,
          creatorId: users[3].id,
          isPublic: true,
          memberCount: 3,
          members: {
            create: [
              { userId: users[3].id, role: 'admin' },
              { userId: users[0].id, role: 'member' },
            ],
          },
        },
      }),
    ]);

    // Create some bookmarks
    await Promise.all([
      db.bookmark.create({ data: { noteId: notes[2].id, userId: users[0].id } }),
      db.bookmark.create({ data: { noteId: notes[6].id, userId: users[0].id } }),
      db.bookmark.create({ data: { noteId: notes[0].id, userId: users[3].id } }),
      db.bookmark.create({ data: { noteId: notes[13].id, userId: users[1].id } }),
    ]);

    // Create some follows
    await Promise.all([
      db.follow.create({ data: { followerId: users[0].id, followingId: users[3].id, type: 'user' } }),
      db.follow.create({ data: { followerId: users[3].id, followingId: users[0].id, type: 'user' } }),
      db.follow.create({ data: { followerId: users[1].id, followingId: users[3].id, type: 'user' } }),
      db.follow.create({ data: { followerId: users[0].id, subjectId: subjects[2].id, type: 'subject' } }),
      db.follow.create({ data: { followerId: users[3].id, subjectId: subjects[0].id, type: 'subject' } }),
      db.follow.create({ data: { followerId: users[0].id, collegeId: colleges[1].id, type: 'college' } }),
    ]);

    // Create bookmark folders
    const folders = await Promise.all([
      db.bookmarkFolder.create({ data: { name: 'CS Fundamentals', userId: users[0].id, color: '#10B981', icon: '💻' } }),
      db.bookmarkFolder.create({ data: { name: 'Exam Prep', userId: users[0].id, color: '#F59E0B', icon: '📝' } }),
      db.bookmarkFolder.create({ data: { name: 'Research Papers', userId: users[3].id, color: '#8B5CF6', icon: '📄' } }),
    ]);

    // Update some bookmarks with folders
    await db.bookmark.updateMany({
      where: { noteId: notes[2].id, userId: users[0].id },
      data: { folderId: folders[0].id },
    });
    await db.bookmark.updateMany({
      where: { noteId: notes[6].id, userId: users[0].id },
      data: { folderId: folders[1].id },
    });

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      stats: {
        colleges: colleges.length,
        departments: departments.length,
        subjects: subjects.length,
        users: users.length,
        notes: notes.length,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: 'Failed to seed database' }, { status: 500 });
  }
}
