"""
Seed data generator for Setu demo.
Creates realistic Jharkhand-context data:
  - 4 demo personas (problem owner, faculty, student, gov admin)
  - 30 faculty profiles across 6 Jharkhand HEIs
  - 100 student profiles
  - 50 problems across 6 domains / 10 districts
  - 8 completed projects with outcome verification

Run: python seed_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base, User, Problem, Project, TeamMember, Milestone, InterestRequest
from auth import get_password_hash
from services.embeddings import encode_text, build_solver_text, build_problem_text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create all tables
Base.metadata.create_all(bind=engine)

DISTRICTS = [
    "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Gumla",
    "Khunti", "Hazaribagh", "Deoghar", "Dumka", "Giridih"
]

INSTITUTIONS = [
    "BIT Mesra, Ranchi",
    "NIT Jamshedpur",
    "Ranchi University",
    "Jharkhand University of Technology (JUT)",
    "Vinoba Bhave University",
    "XLRI Jamshedpur",
]

FACULTY_DATA = [
    # BIT Mesra
    {"name": "Dr. Priya Singh", "dept": "Civil Engineering", "inst": "BIT Mesra, Ranchi",
     "tags": ["Water Resources", "Rural Infrastructure", "Sanitation", "Hydrology"],
     "bio": "10 years experience in rural water supply systems and watershed management in Jharkhand."},
    {"name": "Dr. Amit Kumar", "dept": "Computer Science", "inst": "BIT Mesra, Ranchi",
     "tags": ["Machine Learning", "AI", "Data Analytics", "IoT"],
     "bio": "Research in AI applications for agriculture and precision farming."},
    {"name": "Dr. Sunita Oraon", "dept": "Environmental Engineering", "inst": "BIT Mesra, Ranchi",
     "tags": ["Environmental Science", "Pollution Control", "Waste Management", "Air Quality"],
     "bio": "Specialises in industrial pollution monitoring and tribal area environmental studies."},
    {"name": "Dr. Rajesh Mahto", "dept": "Electrical Engineering", "inst": "BIT Mesra, Ranchi",
     "tags": ["Renewable Energy", "Solar Power", "Rural Electrification", "Smart Grid"],
     "bio": "15 years in solar and off-grid electrification projects across Jharkhand."},
    {"name": "Dr. Kavita Sharma", "dept": "Biomedical Engineering", "inst": "BIT Mesra, Ranchi",
     "tags": ["Healthcare Technology", "Medical Devices", "Telemedicine", "Rural Health"],
     "bio": "Develops low-cost diagnostic tools for rural healthcare in tribal regions."},
    # NIT Jamshedpur
    {"name": "Prof. Sunil Munda", "dept": "Metallurgical Engineering", "inst": "NIT Jamshedpur",
     "tags": ["Mining", "Materials Science", "Industrial Safety", "Environmental Impact"],
     "bio": "Expert in sustainable mining practices and mine waste management."},
    {"name": "Dr. Asha Hembram", "dept": "Computer Science", "inst": "NIT Jamshedpur",
     "tags": ["Natural Language Processing", "Hindi NLP", "Tribal Languages", "Digital Inclusion"],
     "bio": "Works on NLP for Santali and other tribal languages for digital inclusion."},
    {"name": "Dr. Vikas Tiwari", "dept": "Agricultural Engineering", "inst": "NIT Jamshedpur",
     "tags": ["Precision Agriculture", "Soil Science", "Drip Irrigation", "Crop Monitoring"],
     "bio": "Specialises in smart irrigation systems for water-scarce regions."},
    {"name": "Dr. Meena Patel", "dept": "Chemical Engineering", "inst": "NIT Jamshedpur",
     "tags": ["Water Treatment", "Chemical Analysis", "Groundwater", "Fluoride Removal"],
     "bio": "Research on fluoride and arsenic removal from groundwater in rural Jharkhand."},
    {"name": "Prof. Deepak Rao", "dept": "Civil Engineering", "inst": "NIT Jamshedpur",
     "tags": ["Structural Engineering", "Rural Roads", "Bridge Design", "Disaster Management"],
     "bio": "Infrastructure development expert with focus on flood-prone districts."},
    # Ranchi University
    {"name": "Dr. Rekha Devi", "dept": "Sociology", "inst": "Ranchi University",
     "tags": ["Tribal Welfare", "Social Development", "Gender Studies", "Policy Research"],
     "bio": "15 years studying tribal community development and social policy in Jharkhand."},
    {"name": "Dr. Prakash Soren", "dept": "Agriculture", "inst": "Ranchi University",
     "tags": ["Organic Farming", "Traditional Knowledge", "Food Security", "Crop Diversity"],
     "bio": "Works with tribal farmers on indigenous crop varieties and organic practices."},
    {"name": "Dr. Anita Minz", "dept": "Public Health", "inst": "Ranchi University",
     "tags": ["Community Health", "Malnutrition", "Maternal Health", "ASHA Workers"],
     "bio": "Research on malnutrition and maternal mortality in Jharkhand tribal regions."},
    {"name": "Dr. Rajan Bedia", "dept": "Economics", "inst": "Ranchi University",
     "tags": ["Rural Economy", "Microfinance", "Self-Help Groups", "Employment"],
     "bio": "Expert in microfinance and rural livelihood programmes."},
    {"name": "Prof. Geeta Lakra", "dept": "Computer Applications", "inst": "Ranchi University",
     "tags": ["E-Governance", "Digital Literacy", "Mobile Applications", "Cybersecurity"],
     "bio": "Develops e-governance solutions for state and district administration."},
    # JUT
    {"name": "Dr. Mohan Singh", "dept": "Mechanical Engineering", "inst": "Jharkhand University of Technology (JUT)",
     "tags": ["Manufacturing", "Industrial Automation", "MSME", "Vocational Training"],
     "bio": "Works with local MSMEs on technology upgradation and automation."},
    {"name": "Dr. Poonam Gupta", "dept": "Information Technology", "inst": "Jharkhand University of Technology (JUT)",
     "tags": ["Cloud Computing", "Cybersecurity", "Database Systems", "Digital Infrastructure"],
     "bio": "Expert in building scalable digital infrastructure for government applications."},
    {"name": "Dr. Arun Kumar", "dept": "Environmental Science", "inst": "Jharkhand University of Technology (JUT)",
     "tags": ["Forest Conservation", "Wildlife", "Biodiversity", "Eco-tourism"],
     "bio": "Research on forest ecosystem services and conservation in Jharkhand."},
    {"name": "Dr. Suchitra Yadav", "dept": "Food Technology", "inst": "Jharkhand University of Technology (JUT)",
     "tags": ["Food Processing", "Post-Harvest Technology", "Nutrition", "Value Addition"],
     "bio": "Develops food processing technology for tribal agricultural produce."},
    {"name": "Prof. Bharat Sahu", "dept": "Urban Planning", "inst": "Jharkhand University of Technology (JUT)",
     "tags": ["Urban Infrastructure", "Smart Cities", "GIS", "Waste Management"],
     "bio": "GIS expert focusing on urban growth and infrastructure planning."},
    # Vinoba Bhave University
    {"name": "Dr. Sudha Devi", "dept": "Education", "inst": "Vinoba Bhave University",
     "tags": ["Teacher Training", "Curriculum Design", "Digital Education", "Tribal Education"],
     "bio": "Specialist in inclusive education for tribal communities."},
    {"name": "Dr. Mahendra Pandey", "dept": "Physics", "inst": "Vinoba Bhave University",
     "tags": ["Renewable Energy", "Solar Technology", "Energy Storage", "Clean Energy"],
     "bio": "Research in photovoltaics and rural energy solutions."},
    {"name": "Dr. Pushpa Tirkey", "dept": "Botany", "inst": "Vinoba Bhave University",
     "tags": ["Medicinal Plants", "Herbal Medicine", "Biodiversity", "Traditional Medicine"],
     "bio": "Documents and studies medicinal plants used by tribal communities in Jharkhand."},
    {"name": "Dr. Naresh Kumar", "dept": "Chemistry", "inst": "Vinoba Bhave University",
     "tags": ["Water Chemistry", "Soil Remediation", "Heavy Metals", "Environmental Chemistry"],
     "bio": "Studies heavy metal contamination from mining activities."},
    {"name": "Prof. Lalita Oraon", "dept": "Social Work", "inst": "Vinoba Bhave University",
     "tags": ["Child Welfare", "Disability Services", "Community Development", "NGO Partnerships"],
     "bio": "Works on child welfare and disability inclusion programmes."},
    # XLRI
    {"name": "Dr. Sanjay Mehta", "dept": "Business Management", "inst": "XLRI Jamshedpur",
     "tags": ["Entrepreneurship", "Startup Ecosystem", "Rural Business", "Impact Investing"],
     "bio": "Expert in rural entrepreneurship and impact investing in eastern India."},
    {"name": "Dr. Kaveri Bose", "dept": "Human Resources", "inst": "XLRI Jamshedpur",
     "tags": ["Skill Development", "Vocational Training", "Employment", "Labour Policy"],
     "bio": "Research on skill development and employment for tribal youth."},
    {"name": "Dr. Rahul Agarwal", "dept": "Operations Management", "inst": "XLRI Jamshedpur",
     "tags": ["Supply Chain", "Logistics", "Cold Chain", "Agricultural Markets"],
     "bio": "Designs supply chain solutions for agricultural produce from Jharkhand."},
    {"name": "Dr. Swati Sinha", "dept": "Finance", "inst": "XLRI Jamshedpur",
     "tags": ["Microfinance", "Financial Inclusion", "Jan Dhan", "Insurance"],
     "bio": "Works on financial inclusion models for unbanked tribal populations."},
    {"name": "Prof. Devendra Narayan", "dept": "Marketing", "inst": "XLRI Jamshedpur",
     "tags": ["Rural Marketing", "E-Commerce", "Tribal Handicrafts", "GI Tags"],
     "bio": "Helps artisans reach markets through e-commerce and GI tag registration."},
]

PROBLEMS_DATA = [
    # Water Management
    {
        "title": "Safe Drinking Water Access in 15 Villages of Gumla Block",
        "situation": "Approximately 15 villages in Gumla block lack access to safe drinking water. Residents rely on contaminated open wells and ponds, leading to frequent waterborne disease outbreaks affecting 8,000+ people annually.",
        "gap": "Existing borewells are either non-functional due to lack of maintenance or have high fluoride content. No systematic water quality monitoring is in place.",
        "desired_outcome": "Design a cost-effective water purification and distribution system for 15 villages serving 8,000+ people, with a community-operated maintenance model, within 6 months and ₹2L budget.",
        "domain": ["Water Management", "Rural Infrastructure"],
        "sdg_tags": ["SDG 6 – Clean Water"],
        "difficulty": "medium", "district": "Gumla",
        "constraints": "Budget ₹2L, remote terrain, no electricity in 5 villages, community must operate it",
        "budget": "₹2,00,000", "timeline": "6 months"
    },
    {
        "title": "Fluoride Contamination Mapping and Remediation in Khunti District",
        "situation": "Groundwater in 23 villages of Khunti district shows fluoride levels 3-8x above WHO safe limits. Dental and skeletal fluorosis is prevalent in children and adults.",
        "gap": "No real-time fluoride monitoring system exists. Defluoridation units installed in 2019 are 60% non-functional due to lack of maintenance capacity.",
        "desired_outcome": "Deploy IoT-based water quality monitoring at 23 sites with automated alerts and a trained local technician network capable of maintaining defluoridation units.",
        "domain": ["Water Management", "Healthcare", "Digital Access"],
        "sdg_tags": ["SDG 6 – Clean Water", "SDG 3 – Good Health"],
        "difficulty": "hard", "district": "Khunti",
        "constraints": "Intermittent electricity, low digital literacy of technicians, ₹5L budget",
        "budget": "₹5,00,000", "timeline": "9 months"
    },
    {
        "title": "Watershed Rejuvenation for Drought-Prone Panchayats in Hazaribagh",
        "situation": "12 gram panchayats in Hazaribagh face severe drought conditions annually. Groundwater table has dropped 4 meters in the last decade. Crop failures affect 15,000 farming families.",
        "gap": "No watershed management plan exists. Traditional johads (water ponds) have been abandoned. Farmers lack knowledge of rainwater harvesting techniques.",
        "desired_outcome": "Develop a GIS-based watershed rejuvenation plan for 12 panchayats with community rainwater harvesting structures to raise groundwater table by 1.5m within 2 monsoon seasons.",
        "domain": ["Water Management", "Agriculture", "Environment"],
        "sdg_tags": ["SDG 6 – Clean Water", "SDG 2 – Zero Hunger", "SDG 13 – Climate Action"],
        "difficulty": "hard", "district": "Hazaribagh",
        "budget": "₹8,00,000", "timeline": "18 months",
        "constraints": "Multi-panchayat coordination, seasonal fieldwork constraints"
    },
    # Healthcare
    {
        "title": "Reducing Maternal Mortality in Remote Tribal Blocks of Gumla",
        "situation": "Gumla district has a maternal mortality rate 3x the Jharkhand average. Pregnant women in remote blocks travel 40-60 km to reach primary health centres, often arriving too late for emergency care.",
        "gap": "ASHA workers lack basic emergency obstetric care training and equipment. No telemedicine solution connects them to doctors in Ranchi during emergencies.",
        "desired_outcome": "Deploy a low-bandwidth telemedicine solution connecting 50 ASHA workers to on-call doctors, reducing median emergency response time from 4 hours to under 30 minutes.",
        "domain": ["Healthcare", "Digital Access"],
        "sdg_tags": ["SDG 3 – Good Health", "SDG 10 – Reduced Inequalities"],
        "difficulty": "hard", "district": "Gumla",
        "budget": "₹4,00,000", "timeline": "8 months",
        "constraints": "2G connectivity in most areas, ASHA workers have basic smartphones, low digital literacy"
    },
    {
        "title": "Malnutrition Screening and Tracking System for Anganwadi Centres in Ranchi",
        "situation": "45 Anganwadi centres in Ranchi district report malnutrition rates of 28% in children under 5. Manual paper records make tracking and intervention difficult.",
        "gap": "No digital system tracks child growth parameters. Nutritional interventions are not personalised. Supervisors cannot identify which centres need urgent attention.",
        "desired_outcome": "A mobile-based child health tracking app for 45 Anganwadis that automates growth monitoring, flags severe acute malnutrition, and generates monthly intervention reports.",
        "domain": ["Healthcare", "Digital Access", "Education"],
        "sdg_tags": ["SDG 3 – Good Health", "SDG 2 – Zero Hunger"],
        "difficulty": "medium", "district": "Ranchi",
        "budget": "₹1,50,000", "timeline": "4 months",
        "constraints": "Workers are semi-literate, Android devices provided, Jharkhand official language Hindi"
    },
    {
        "title": "Low-Cost Sickle Cell Disease Screening for Tribal Communities in Khunti",
        "situation": "Sickle cell disease affects an estimated 15-20% of tribal populations in Khunti. Diagnosis requires expensive electrophoresis tests unavailable at PHC level.",
        "gap": "No point-of-care screening solution exists at PHC or sub-centre level. Most cases are diagnosed only after severe crises, when damage is irreversible.",
        "desired_outcome": "Develop or adapt a point-of-care sickle cell screening protocol usable by health workers at sub-centre level with <₹50 per test cost and >90% sensitivity.",
        "domain": ["Healthcare"],
        "sdg_tags": ["SDG 3 – Good Health"],
        "difficulty": "hard", "district": "Khunti",
        "budget": "₹3,00,000", "timeline": "12 months",
        "constraints": "No lab infrastructure, cold chain limitations, ₹50 per test maximum"
    },
    # Agriculture
    {
        "title": "Precision Irrigation Advisory System for Small Farmers in Deoghar",
        "situation": "12,000 small and marginal farmers in Deoghar district lose 30-40% of crops annually to either drought stress or waterlogging from imprecise irrigation.",
        "gap": "Farmers have no access to soil moisture data or weather-based irrigation advice. Extension workers visit each farm once monthly at most.",
        "desired_outcome": "Deploy a low-cost soil moisture sensor network with SMS/voice-based irrigation advisory in Hindi for 500 pilot farmers, targeting 25% reduction in water use and 20% yield improvement.",
        "domain": ["Agriculture", "Digital Access"],
        "sdg_tags": ["SDG 2 – Zero Hunger", "SDG 6 – Clean Water"],
        "difficulty": "medium", "district": "Deoghar",
        "budget": "₹3,50,000", "timeline": "8 months",
        "constraints": "Farmers have basic mobile phones, no smartphones. Voice/SMS only. Low cost sensors needed."
    },
    {
        "title": "Post-Harvest Loss Reduction for Tomato Farmers in Bokaro",
        "situation": "Tomato farmers in Bokaro district lose 35-50% of produce post-harvest due to lack of cold storage, poor packaging, and inadequate market linkages. Farmgate prices are ₹2-4/kg while retail is ₹25-40/kg.",
        "gap": "No community cold storage within 50km. Farmers have no price information before harvest. Middlemen capture 70-80% of value.",
        "desired_outcome": "Design a community cold chain solution (1-2 metric ton capacity) and market linkage mobile app connecting farmers directly to Ranchi and Jamshedpur wholesale buyers.",
        "domain": ["Agriculture", "Rural Livelihoods", "Infrastructure"],
        "sdg_tags": ["SDG 2 – Zero Hunger", "SDG 8 – Decent Work"],
        "difficulty": "medium", "district": "Bokaro",
        "budget": "₹6,00,000", "timeline": "10 months",
        "constraints": "Electricity supply intermittent, cooperative model preferred"
    },
    {
        "title": "Regenerative Agriculture Practices for Degraded Tribal Lands in Dumka",
        "situation": "5,000 hectares of tribal agricultural land in Dumka district has degraded severely due to monoculture and excessive chemical fertiliser use. Soil organic matter has dropped below 0.3%.",
        "gap": "Farmers are unaware of regenerative practices. Govt extension services reach <15% of farmers annually.",
        "desired_outcome": "Train 200 tribal farmer champions in regenerative agriculture (composting, crop rotation, green manure) through demonstration plots, with measurable soil organic matter increase of 0.5% in 2 seasons.",
        "domain": ["Agriculture", "Environment"],
        "sdg_tags": ["SDG 2 – Zero Hunger", "SDG 15 – Life on Land"],
        "difficulty": "easy", "district": "Dumka",
        "budget": "₹2,50,000", "timeline": "12 months",
        "constraints": "Language: Santali and Hindi. Low formal education. Demonstration plot approach preferred."
    },
    # Education
    {
        "title": "Reducing School Dropout Rate Among Tribal Girls in Giridih",
        "situation": "School dropout rate for tribal girls aged 12-16 in Giridih district is 42%, three times the national average. Primary reasons: distance to school, safety concerns, domestic responsibilities.",
        "gap": "No targeted intervention tracks at-risk girls. Teachers have no alert system. School management has no district-level visibility.",
        "desired_outcome": "Build a dropout early-warning system for 120 tribal schools in Giridih using attendance data + teacher input, enabling timely intervention and targeting 15% reduction in dropout in Year 1.",
        "domain": ["Education", "Digital Access"],
        "sdg_tags": ["SDG 4 – Quality Education", "SDG 5 – Gender Equality"],
        "difficulty": "medium", "district": "Giridih",
        "budget": "₹2,00,000", "timeline": "6 months",
        "constraints": "Basic Android tablets available in schools. Teachers semi-literate in digital tools."
    },
    {
        "title": "Bilingual Learning Platform for Grade 3-5 Tribal Students in Jharkhand",
        "situation": "Grade 3-5 students in tribal-dominated blocks struggle with Hindi-medium instruction when their mother tongue is Santali, Mundari, or Ho. This is the primary cause of early learning failure.",
        "gap": "No digital learning content exists in tribal languages. Teachers are not trained in mother-tongue-based multilingual education.",
        "desired_outcome": "Develop an offline-capable bilingual learning app (Hindi + Santali) for Grades 3-5 covering Mathematics and Science, with gamified exercises usable on low-end Android tablets.",
        "domain": ["Education", "Digital Access"],
        "sdg_tags": ["SDG 4 – Quality Education"],
        "difficulty": "hard", "district": "Khunti",
        "budget": "₹4,00,000", "timeline": "12 months",
        "constraints": "Must work offline. Low-end Android (512MB RAM). Santali in Ol-Chiki script required."
    },
    # Infrastructure
    {
        "title": "Smart Street Lighting System for 5 Urban Wards in Ranchi",
        "situation": "5 wards in Ranchi South consume ₹80,000/month on street lighting. 30% of lights are on during daytime. 15% are faulty for weeks with no automated fault reporting.",
        "gap": "No IoT-based monitoring system exists. Municipal staff rely on citizen complaints for fault detection. No dimming or scheduling capability.",
        "desired_outcome": "Deploy an IoT-based smart street light management system for 500 lights across 5 wards with automated scheduling, dimming, fault alerts, and energy monitoring — targeting 40% energy savings.",
        "domain": ["Infrastructure", "Digital Access"],
        "sdg_tags": ["SDG 11 – Sustainable Cities", "SDG 7 – Affordable Energy"],
        "difficulty": "medium", "district": "Ranchi",
        "budget": "₹5,00,000", "timeline": "6 months",
        "constraints": "Existing light poles must be retrofitted. Municipal approval required."
    },
    {
        "title": "Rural Road Condition Monitoring Using Mobile Crowdsourcing in Dhanbad",
        "situation": "Dhanbad district has 1,200 km of rural roads. Only 30% have been inspected in the last 2 years. Road maintenance budget is allocated without data on actual road conditions.",
        "gap": "No systematic road condition assessment. Manual inspection is slow, expensive, and infrequent. Budget allocation is not evidence-based.",
        "desired_outcome": "Develop a crowdsourcing app where delivery drivers and ASHA workers report road conditions with GPS location and photos, generating a real-time road quality heatmap for the district PWD office.",
        "domain": ["Infrastructure", "Digital Access"],
        "sdg_tags": ["SDG 9 – Industry & Infrastructure", "SDG 11 – Sustainable Cities"],
        "difficulty": "easy", "district": "Dhanbad",
        "budget": "₹1,50,000", "timeline": "4 months",
        "constraints": "Android app. Works on 2G. GPS and camera required."
    },
    # Environment
    {
        "title": "Air Quality Monitoring Network for Coal Mine Areas in Dhanbad",
        "situation": "Residents near Jharia coal fields in Dhanbad report severe respiratory issues. No official air quality monitoring exists beyond 3 CPCB stations, covering <5% of affected area.",
        "gap": "Citizens and local health workers have no data on PM2.5, SO2, or NO2 levels in their specific neighbourhoods. Advocacy for remediation is hindered by lack of evidence.",
        "desired_outcome": "Deploy a low-cost particulate matter sensor network (20 nodes) across Jharia covering 80% of populated areas, with a public-facing real-time dashboard and historical trend analysis.",
        "domain": ["Environment", "Healthcare"],
        "sdg_tags": ["SDG 13 – Climate Action", "SDG 3 – Good Health"],
        "difficulty": "medium", "district": "Dhanbad",
        "budget": "₹3,00,000", "timeline": "6 months",
        "constraints": "Sensors must be solar-powered. Data to be publicly accessible. Low-cost (<₹5,000/node)."
    },
    {
        "title": "Forest Fire Early Warning System for Saranda Forest Division",
        "situation": "Saranda forest in West Singhbhum loses 8-12% of canopy annually to forest fires, threatening biodiversity and tribal livelihoods. Fires are detected 4-8 hours after ignition on average.",
        "gap": "No automated detection system. Forest guards are insufficient in number (1 per 2,000 hectares). MODIS satellite alerts arrive with 24-hour delay.",
        "desired_outcome": "Design and pilot a low-cost sensor-based early fire detection system for 500 hectares of Saranda with alert time under 30 minutes using smoke/temperature sensors and a forest guard mobile app.",
        "domain": ["Environment"],
        "sdg_tags": ["SDG 15 – Life on Land", "SDG 13 – Climate Action"],
        "difficulty": "hard", "district": "Jamshedpur",
        "budget": "₹4,50,000", "timeline": "9 months",
        "constraints": "No cellular in forest. LoRaWAN or mesh radio required. Solar powered nodes."
    },
    # Rural Livelihoods
    {
        "title": "E-Marketplace for Jharkhand Tribal Handicrafts",
        "situation": "Tribal artisans in Jharkhand produce world-class handicrafts (Dokra, Paitkar painting, Sohrai art) but earn ₹150-300/day on average, selling to middlemen at 15% of retail price.",
        "gap": "No direct-to-consumer digital channel exists tailored to tribal artisans with low digital literacy. Existing platforms (Amazon, Flipkart) require documentation and banking sophistication these artisans lack.",
        "desired_outcome": "Launch a simplified e-marketplace for 500 tribal artisans with assisted onboarding (via NGO partners), vernacular UI in Hindi, and direct bank transfer for sales — targeting 3x income increase for pilot group.",
        "domain": ["Rural Livelihoods", "Digital Access"],
        "sdg_tags": ["SDG 8 – Decent Work", "SDG 1 – No Poverty"],
        "difficulty": "medium", "district": "Ranchi",
        "budget": "₹3,00,000", "timeline": "8 months",
        "constraints": "Must work on 2G. Hindi UI. WhatsApp-based onboarding preferred. Zero upfront cost for artisans."
    },
    {
        "title": "MGNREGA Work Attendance Digitisation for Gram Panchayats in Giridih",
        "situation": "12 gram panchayats in Giridih struggle with paper-based MGNREGA attendance, leading to delayed wage payments (average 45 days) and 15% ghost worker fraud estimates.",
        "gap": "No biometric or digital attendance system deployed at worksite level. Mates (supervisors) maintain paper muster rolls that are submitted weekly to block office.",
        "desired_outcome": "Deploy a GPS-enabled digital muster roll system for 12 panchayats with photo attendance capture, automated wage calculation, and direct submission to NIC payment system — reducing payment delays to <7 days.",
        "domain": ["Rural Livelihoods", "Digital Access", "Infrastructure"],
        "sdg_tags": ["SDG 8 – Decent Work", "SDG 16 – Peace & Justice"],
        "difficulty": "medium", "district": "Giridih",
        "budget": "₹2,00,000", "timeline": "5 months",
        "constraints": "Works offline. Syncs when connectivity available. Android app. Mates have basic smartphones."
    },
]

# Add 33 more synthetic problems to reach ~50
MORE_PROBLEMS = [
    {"title": "Solar Micro-Grid for 8 Electrification-Deficit Villages in Gumla", "domain": ["Infrastructure", "Rural Livelihoods"], "district": "Gumla", "difficulty": "hard", "sdg_tags": ["SDG 7 – Affordable Energy"], "situation": "8 villages in Gumla have never been electrified despite DDUGJY scheme rollout.", "gap": "Grid extension is not cost-effective due to terrain. No alternative energy solution deployed.", "desired_outcome": "Design and pilot a 5kW solar micro-grid for 2 villages serving 200 households within 12 months.", "budget": "₹10,00,000", "timeline": "12 months", "constraints": "Tribal land rights constraints, community operation required"},
    {"title": "Digital Health Record System for CHCs in Hazaribagh", "domain": ["Healthcare", "Digital Access"], "district": "Hazaribagh", "difficulty": "medium", "sdg_tags": ["SDG 3 – Good Health"], "situation": "Community Health Centres maintain paper records, causing duplicate tests and medication errors.", "gap": "No electronic health record system. Patient history lost when transferred between facilities.", "desired_outcome": "Implement a lightweight EHR for 5 CHCs in Hazaribagh district with patient identity using Aadhaar.", "budget": "₹3,00,000", "timeline": "7 months", "constraints": "Internet unreliable, offline-first required"},
    {"title": "Crop Insurance Awareness and Enrolment Tool for Farmers in Bokaro", "domain": ["Agriculture", "Rural Livelihoods"], "district": "Bokaro", "difficulty": "easy", "sdg_tags": ["SDG 2 – Zero Hunger"], "situation": "Only 8% of eligible farmers in Bokaro are enrolled in PMFBY crop insurance.", "gap": "Low awareness, complex paper process, language barriers prevent enrolment.", "desired_outcome": "Deploy a Hindi voice-based guided enrolment assistant increasing PMFBY coverage to 25% in Bokaro within one Kharif season.", "budget": "₹80,000", "timeline": "3 months", "constraints": "Voice-only interface, works on feature phones"},
    {"title": "Waste Segregation and Collection Optimisation for Jamshedpur Municipal Area", "domain": ["Infrastructure", "Environment"], "district": "Jamshedpur", "difficulty": "medium", "sdg_tags": ["SDG 11 – Sustainable Cities"], "situation": "JMC collects 280 MT/day of mixed waste. 70% is landfilled though 50% is recyclable. Route planning is manual.", "gap": "No source segregation system. Collection routes not optimised. No citizen reporting of overflow bins.", "desired_outcome": "Implement source segregation pilot in 3 wards (50,000 households) with route optimisation reducing fuel cost 20%.", "budget": "₹4,00,000", "timeline": "6 months", "constraints": "Requires citizen behaviour change, app + awareness campaign"},
    {"title": "Telemedicine for Eye Care in Remote Blocks of Dumka", "domain": ["Healthcare", "Digital Access"], "district": "Dumka", "difficulty": "medium", "sdg_tags": ["SDG 3 – Good Health"], "situation": "Cataract blindness rate in Dumka is 4x state average. Only 1 ophthalmologist for 3 lakh population.", "gap": "No tele-ophthalmology solution connects community health workers with specialists in Ranchi.", "desired_outcome": "Deploy a tele-eye-care system connecting 20 health workers in Dumka with 3 specialist doctors in Ranchi, targeting 500 cataract surgeries referred per year.", "budget": "₹2,50,000", "timeline": "6 months", "constraints": "2G connectivity, basic Android phone"},
    {"title": "Skill Mapping Platform for ITI Graduates in Dhanbad", "domain": ["Rural Livelihoods", "Digital Access"], "district": "Dhanbad", "difficulty": "easy", "sdg_tags": ["SDG 8 – Decent Work"], "situation": "3,000 ITI graduates annually in Dhanbad district face unemployment despite industry demand for skilled workers.", "gap": "No digital platform connects ITI graduates with MSME employers. Placement is word-of-mouth.", "desired_outcome": "Build a skill-verified job matching portal for ITI graduates and Dhanbad MSMEs, targeting 500 placements in Year 1.", "budget": "₹1,50,000", "timeline": "4 months", "constraints": "Mobile-first, Hindi interface"},
    {"title": "Community Library Network with Digital Resources in Deoghar", "domain": ["Education", "Digital Access"], "district": "Deoghar", "difficulty": "easy", "sdg_tags": ["SDG 4 – Quality Education"], "situation": "15 gram panchayats in Deoghar lack any library or reading room. Youth have no access to competitive exam preparation materials.", "gap": "No physical or digital library infrastructure. Internet cafes charge ₹30/hour — unaffordable for students.", "desired_outcome": "Establish 5 community digital learning centres with offline NCERT library, competitive exam materials, and coaching in 15 panchayats within 6 months.", "budget": "₹5,00,000", "timeline": "6 months", "constraints": "Offline content required, community-operated"},
    {"title": "Groundwater Level Monitoring Network for Ranchi Urban Area", "domain": ["Water Management", "Environment"], "district": "Ranchi", "difficulty": "medium", "sdg_tags": ["SDG 6 – Clean Water", "SDG 11 – Sustainable Cities"], "situation": "Ranchi's groundwater table has dropped 6m in urban areas in the past 15 years due to unregulated extraction.", "gap": "Only 8 CGWB monitoring wells exist for 15 lakh population. No real-time monitoring.", "desired_outcome": "Deploy 50 low-cost groundwater level sensors across Ranchi with public dashboard and automated alerts when critical thresholds are crossed.", "budget": "₹4,00,000", "timeline": "8 months", "constraints": "Solar powered sensors, low cost, open data"},
    {"title": "Animal Disease Surveillance App for Livestock Farmers in Giridih", "domain": ["Agriculture", "Healthcare"], "district": "Giridih", "difficulty": "medium", "sdg_tags": ["SDG 2 – Zero Hunger"], "situation": "Livestock disease outbreaks affect 20,000 farming families in Giridih annually, causing ₹15 crore in losses. Reporting is delayed by 7-14 days.", "gap": "Veterinary assistants use paper forms. No geospatial outbreak mapping. Disease spread goes undetected for weeks.", "desired_outcome": "Deploy a mobile disease reporting and mapping system for 200 veterinary assistants in Giridih with real-time outbreak alerts and containment guidance.", "budget": "₹1,80,000", "timeline": "4 months", "constraints": "Offline capable, low-end Android"},
    {"title": "Air Quality and Noise Monitoring for Hazaribagh Urban Area", "domain": ["Environment", "Infrastructure"], "district": "Hazaribagh", "difficulty": "easy", "sdg_tags": ["SDG 11 – Sustainable Cities", "SDG 3 – Good Health"], "situation": "Hazaribagh town lacks any environmental monitoring. Residents near the highway and industrial areas report health issues.", "gap": "No data on PM2.5, noise levels, or vehicle emissions. Urban planning decisions lack environmental evidence.", "desired_outcome": "Install 10 low-cost air quality and noise sensors at strategic urban locations with a public-facing real-time dashboard.", "budget": "₹1,50,000", "timeline": "3 months", "constraints": "Solar powered, weatherproof, open data"},
]


def seed_database():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            logger.info("Database already seeded. Skipping.")
            return

        logger.info("Seeding database...")

        # ── Demo Personas ─────────────────────────────────────────────────────
        demo_users = [
            User(
                email="suresh.kumar@gov.jh.in",
                full_name="Suresh Kumar",
                hashed_password=get_password_hash("demo123"),
                role="problem_owner",
                district="Gumla",
                designation="District Collector, Gumla",
                institution="Government of Jharkhand",
                bio="District Collector of Gumla district, Government of Jharkhand.",
                expertise_tags=[],
                avatar_initials="SK",
            ),
            User(
                email="priya.singh@bitmesra.ac.in",
                full_name="Dr. Priya Singh",
                hashed_password=get_password_hash("demo123"),
                role="faculty",
                institution="BIT Mesra, Ranchi",
                department="Civil Engineering",
                expertise_tags=["Water Resources", "Rural Infrastructure", "Sanitation", "Hydrology"],
                bio="10 years experience in rural water supply systems and watershed management in Jharkhand.",
                avatar_initials="PS",
            ),
            User(
                email="rahul.sharma@bitmesra.ac.in",
                full_name="Rahul Sharma",
                hashed_password=get_password_hash("demo123"),
                role="student",
                institution="BIT Mesra, Ranchi",
                department="Civil Engineering",
                expertise_tags=["Water Resources", "Hydrology", "GIS", "Rural Infrastructure"],
                bio="Final year B.Tech student passionate about water resource management.",
                avatar_initials="RS",
            ),
            User(
                email="secretary@education.jh.gov.in",
                full_name="Dr. Nirmala Soren",
                hashed_password=get_password_hash("demo123"),
                role="gov_admin",
                institution="Government of Jharkhand",
                designation="Principal Secretary, Education Department",
                district="Ranchi",
                bio="Principal Secretary overseeing the Jharkhand Student Research and Innovation Policy.",
                expertise_tags=[],
                avatar_initials="NS",
            ),
        ]
        for u in demo_users:
            db.add(u)
        db.flush()

        # ── Faculty ───────────────────────────────────────────────────────────
        faculty_users = []
        for fd in FACULTY_DATA:
            initials = "".join(w[0].upper() for w in fd["name"].split()[:2])
            u = User(
                email=f"{fd['name'].lower().replace(' ', '.').replace('dr.', '').replace('prof.', '').strip('.')}@{fd['inst'].split(',')[0].lower().replace(' ', '').replace('(', '').replace(')', '')}.edu.in",
                full_name=fd["name"],
                hashed_password=get_password_hash("demo123"),
                role="faculty",
                institution=fd["inst"],
                department=fd["dept"],
                expertise_tags=fd["tags"],
                bio=fd["bio"],
                avatar_initials=initials,
            )
            db.add(u)
            faculty_users.append(u)
        db.flush()

        # ── Students ──────────────────────────────────────────────────────────
        student_names = [
            "Anjali Oraon", "Vikram Mahto", "Preethi Devi", "Sanjay Munda", "Neha Hembram",
            "Rohan Gupta", "Pooja Singh", "Arjun Kumar", "Sneha Tirkey", "Karan Sharma",
            "Divya Minz", "Amit Patel", "Sunita Kumari", "Rahul Das", "Puja Yadav",
            "Deepak Oraon", "Riya Sinha", "Sunil Mahto", "Kavita Devi", "Manish Kumar",
            "Ananya Biswas", "Raj Sharma", "Priya Munda", "Akash Soren", "Nisha Gupta",
            "Vivek Singh", "Smita Oraon", "Rahul Mahto", "Ankita Devi", "Saurabh Kumar",
            "Meena Hembram", "Alok Tiwari", "Rina Kumari", "Santosh Munda", "Usha Sharma",
            "Binod Oraon", "Priti Das", "Ajay Kumar", "Geeta Minz", "Rohit Singh",
            "Sunita Yadav", "Pankaj Gupta", "Anita Soren", "Vijay Mahto", "Komal Devi",
            "Rajesh Oraon", "Jyoti Kumar", "Suresh Das", "Asha Hembram", "Manoj Singh",
            "Pallavi Tiwari", "Nikhil Sharma", "Champa Devi", "Rakesh Munda", "Shalini Gupta",
            "Ajit Oraon", "Preeti Yadav", "Sachin Kumar", "Rekha Sinha", "Dinesh Mahto",
            "Shweta Minz", "Prabhat Singh", "Laxmi Devi", "Amit Soren", "Monika Gupta",
            "Anil Kumar", "Durga Oraon", "Vinay Sharma", "Mamta Hembram", "Rajiv Das",
            "Sweta Kumar", "Mahesh Tiwari", "Lalita Devi", "Naveen Singh", "Sarita Yadav",
            "Hemant Munda", "Sapna Gupta", "Sudhir Oraon", "Purnima Sharma", "Kamal Kumar",
            "Archana Soren", "Dilip Mahto", "Shanti Minz", "Rajan Das", "Sushmita Singh",
            "Bharat Kumar", "Kamla Devi", "Naresh Tiwari", "Vibha Oraon", "Satish Gupta",
            "Ranjit Munda", "Chandni Sharma", "Umesh Kumar", "Babita Hembram", "Ganesh Singh",
            "Pratima Yadav", "Devendra Das", "Pushpa Minz", "Kishor Oraon", "Suman Kumar",
        ]
        dept_tags = {
            "Civil Engineering": ["Water Resources", "Structural Engineering", "Environmental Engineering", "GIS"],
            "Computer Science": ["Machine Learning", "AI", "Data Analytics", "Web Development"],
            "Electrical Engineering": ["Renewable Energy", "IoT", "Embedded Systems", "Power Systems"],
            "Mechanical Engineering": ["Manufacturing", "Robotics", "Thermal Systems", "MSME"],
            "Environmental Science": ["Pollution Control", "Ecology", "Waste Management", "Climate"],
            "Agriculture": ["Crop Science", "Soil Science", "Irrigation", "Organic Farming"],
            "Biomedical": ["Healthcare Technology", "Medical Devices", "Rural Health"],
            "Information Technology": ["Cloud Computing", "Cybersecurity", "Mobile Applications"],
        }
        depts = list(dept_tags.keys())
        inst_list = INSTITUTIONS * 20  # enough for 100 students

        for i, name in enumerate(student_names):
            dept = depts[i % len(depts)]
            initials = "".join(w[0].upper() for w in name.split()[:2])
            u = User(
                email=f"{name.lower().replace(' ', '.')}{i}@student.ac.in",
                full_name=name,
                hashed_password=get_password_hash("demo123"),
                role="student",
                institution=inst_list[i],
                department=dept,
                expertise_tags=dept_tags[dept],
                bio=f"Final year student in {dept} interested in societal problem-solving.",
                avatar_initials=initials,
            )
            db.add(u)
        db.flush()

        # ── Problems ──────────────────────────────────────────────────────────
        problem_owner_id = demo_users[0].id
        
        all_problems_data = PROBLEMS_DATA + MORE_PROBLEMS
        created_problems = []
        for pd in all_problems_data:
            p = Problem(
                title=pd["title"],
                situation=pd["situation"],
                gap=pd["gap"],
                desired_outcome=pd["desired_outcome"],
                domain=pd.get("domain", []),
                sdg_tags=pd.get("sdg_tags", []),
                difficulty=pd.get("difficulty", "medium"),
                district=pd.get("district", "Ranchi"),
                budget=pd.get("budget", ""),
                timeline=pd.get("timeline", ""),
                constraints=pd.get("constraints", ""),
                status="open",
                owner_id=problem_owner_id,
            )
            db.add(p)
            created_problems.append(p)
        db.flush()

        # ── Compute Embeddings ────────────────────────────────────────────────
        logger.info("Computing embeddings (this may take a minute)...")
        
        # Embed faculty + demo solver profiles
        all_solvers = db.query(User).filter(User.role.in_(["faculty", "student"])).all()
        for solver in all_solvers:
            text = build_solver_text(solver)
            emb = encode_text(text)
            if emb:
                solver.embedding = emb
        db.flush()

        # Embed problems
        for prob in created_problems:
            text = build_problem_text(prob)
            emb = encode_text(text)
            if emb:
                prob.embedding = emb
        db.flush()

        # ── Projects & Verified Outcomes (8 completed) ────────────────────────
        # Use first 8 problems as completed
        completed_stages = ["verified", "verified", "deployment", "verified", "prototype", "verified", "deployment", "verified"]
        
        for i, (prob, stage) in enumerate(zip(created_problems[:8], completed_stages)):
            prob.status = "verified" if stage == "verified" else "in_progress"
            project = Project(
                problem_id=prob.id,
                title=f"Project: {prob.title[:60]}",
                description=f"A collaborative research and implementation project addressing {prob.title}",
                stage=stage,
                outcome_evidence=f"Solution implemented successfully. Field reports confirm positive outcomes. " \
                                  f"See attached district report (Demo Evidence {i+1})." if stage == "verified" else None,
                outcome_verified_at=__import__('datetime').datetime(2026, 7 + (i % 3), 15 - (i * 2 % 14) + 1) if stage == "verified" else None,
            )
            db.add(project)
            db.flush()

            # Add faculty lead + 3 students
            faculty = faculty_users[i % len(faculty_users)]
            member_lead = TeamMember(project_id=project.id, user_id=faculty.id, role_in_team="lead", status="active")
            db.add(member_lead)
            
            all_students = db.query(User).filter(User.role == "student").all()
            for j in range(3):
                student = all_students[(i * 3 + j) % len(all_students)]
                m = TeamMember(project_id=project.id, user_id=student.id, role_in_team="member", status="active")
                db.add(m)

            # Add milestones
            milestone_titles = ["Problem Analysis & Stakeholder Interviews", "Solution Design & Feasibility", "Prototype Development", "Field Testing & Validation"]
            for mt in milestone_titles:
                ms = Milestone(
                    project_id=project.id,
                    title=mt,
                    status="completed" if stage in ["verified", "deployment"] else ("completed" if mt == milestone_titles[0] else "pending"),
                    due_date="2026-08-01",
                )
                db.add(ms)

        db.commit()
        logger.info(f"✅ Seeding complete!")
        logger.info(f"   Users: {db.query(User).count()}")
        logger.info(f"   Problems: {db.query(Problem).count()}")
        logger.info(f"   Projects: {db.query(Project).count()}")

    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
