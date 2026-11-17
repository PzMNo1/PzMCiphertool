'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const traditional = require('./traditionalChinese.js');
const source = require('./worldSource.js');

const DIRECTORY = __dirname;
const OUTPUT = path.join(DIRECTORY, 'worldExpansion.js');
const CORPUS_OUTPUT = path.join(DIRECTORY, 'worldExpansionCorpus.bin');
const ENDPOINT = 'https://dbpedia.org/sparql';
const USER_AGENT = 'PzM-Knowledge-Expansion/1.0 (local build)';
const PAGE_SIZE = 4000;
const ARTICLE_LIMIT = 24;
const SKIP_ARTICLES = process.argv.includes('--no-articles');
const NAME_STOP = /^(Clown|Professional wrestling|Ronove|Weather Machine|Recursive acronym|Kick the cat|Mushroom management|Perfect crime|Trap street|Phantom settlement|Corrupted Blood incident|Male contraceptive|Homesickness|Penile implant|Room temperature|Maiden flight|Cesspit|T9 \(predictive text\)|SAMV \(algorithm\)|Average CPU power|Breit–Wheeler process|A picture is worth a thousand words|Problem|Resource|Image|Performance|Thesis|Concept|Explanation|Premiere|Audience|Photograph|Show business|Chinese Text Project|Loudspeaker|International Standard Musical Work Code|Striptease|Precovery|Supporting character|Guest appearance|Popularity|Binocular vision|Plastiglomerate|Rural area|Free element|Density dependence|Ulnar collateral ligament reconstruction|Videotelephony|Coronary stent)$/i;
const OCCUPATION_STOP = /(trainer|therapist|counselor|surgeon|physician|nurse|psychologist|economist|engineer|scientist|astronomer|biologist|chemist|physicist|surveyor|ceramist|pedorthist|programmer|bureaucrat|civil servant|entrepreneur|pharmacist|dentist|photographer)$/i;
const EVENT_STOP = /(incident|controversy|scandal|hoax|urban legend|conspiracy theory)$/i;

const DOMAINS = [
    {
        key: 'life',
        section: 'Health, medicine and disease',
        parentId: 'section:health-medicine-and-disease',
        color: 0x22d3ee,
        categories: [
            {
                key: 'clinical',
                nameZh: '临床专科',
                nameEn: 'Clinical specialties',
                description: '临床医学的专科分支与器官系统方向。',
                sources: ['Medical_specialties', 'Cardiology', 'Neurology', 'Oncology', 'Surgery', 'Pediatrics', 'Psychiatry', 'Emergency_medicine', 'Anesthesia', 'Radiology', 'Pathology', 'Dermatology', 'Gastroenterology', 'Endocrinology', 'Nephrology', 'Pulmonology', 'Rheumatology', 'Urology', 'Ophthalmology', 'Orthopedics', 'Pharmacology'],
                limit: 38
            },
            {
                key: 'public',
                nameZh: '公共卫生与全球健康',
                nameEn: 'Public and global health',
                description: '公共卫生、流行病学、全球健康与健康管理方向。',
                sources: ['Public_health', 'Epidemiology', 'Global_health', 'Health_informatics', 'Mental_health', 'Nutrition', 'Physical_fitness', 'Sports_medicine', 'Health_care', 'Health_policy', 'Health_education', 'Health_economics'],
                limit: 36
            },
            {
                key: 'medtech',
                nameZh: '医学技术与工程',
                nameEn: 'Medical technology and engineering',
                description: '医学影像、医疗器械、远程医疗与生物医学工程方向。',
                sources: ['Medical_imaging', 'Medical_technology', 'Telemedicine', 'Biomedical_engineering', 'Rehabilitation_medicine', 'Medical_devices', 'Medical_robotics', 'Radiation_therapy', 'Prosthetics'],
                limit: 32
            },
            {
                key: 'frontiers',
                nameZh: '医学交叉前沿',
                nameEn: 'Medical frontiers',
                description: '医学与信息、工程、生物、社会科学的交叉方向。',
                sources: [],
                limit: 12,
                cross: true
            }
        ]
    },
    {
        key: 'tech',
        section: 'Technology',
        parentId: 'section:technology',
        color: 0xa3e635,
        categories: [
            {
                key: 'engineering',
                nameZh: '工程学科',
                nameEn: 'Engineering disciplines',
                description: '机械、电气、土木、化工、航空航天等工程学科。',
                sources: ['Engineering_disciplines', 'Mechanical_engineering', 'Electrical_engineering', 'Civil_engineering', 'Chemical_engineering', 'Aerospace_engineering', 'Industrial_engineering', 'Environmental_engineering', 'Marine_engineering', 'Mining_engineering', 'Petroleum_engineering', 'Agricultural_engineering'],
                limit: 36
            },
            {
                key: 'intelligent',
                nameZh: '智能与信息技术',
                nameEn: 'Intelligent and information technology',
                description: '人工智能、机器人、数据科学、软件与通信方向。',
                sources: ['Artificial_intelligence', 'Robotics', 'Data_science', 'Software_engineering', 'Quantum_computing', 'Telecommunications', 'Information_technology', 'Computer_vision', 'Natural_language_processing', 'Machine_learning', 'Computer_engineering'],
                limit: 36
            },
            {
                key: 'materials',
                nameZh: '材料、能源与制造',
                nameEn: 'Materials, energy and manufacturing',
                description: '材料科学、纳米技术、光子学、能源与核技术方向。',
                sources: ['Materials_science', 'Nanotechnology', 'Photonics', 'Energy_technology', 'Nuclear_technology', 'Semiconductor', 'Superconductivity', 'Metallurgy', 'Polymer_science', 'Manufacturing'],
                limit: 32
            },
            {
                key: 'frontiers',
                nameZh: '交叉工程',
                nameEn: 'Interdisciplinary engineering',
                description: '工程与生命、信息、社会、环境科学的交叉方向。',
                sources: [],
                limit: 12,
                cross: true
            }
        ]
    },
    {
        key: 'humanities',
        section: 'Arts',
        parentId: 'section:arts',
        color: 0xec4899,
        categories: [
            {
                key: 'artforms',
                nameZh: '艺术门类',
                nameEn: 'Art forms',
                description: '视觉艺术、表演艺术、建筑、电影与艺术史方向。',
                sources: ['Visual_arts', 'Performing_arts', 'Theatre', 'Dance', 'Music', 'Film', 'Architecture', 'Art_history', 'Photography', 'Sculpture', 'Painting'],
                limit: 32
            },
            {
                key: 'disciplines',
                nameZh: '人文学科',
                nameEn: 'Humanities disciplines',
                description: '哲学、文学、语言学、历史、宗教、伦理与美学方向。',
                sources: ['Philosophy', 'Literature', 'Linguistics', 'History', 'Religion', 'Ethics', 'Aesthetics', 'Cultural_studies', 'Classics', 'Rhetoric'],
                limit: 32,
                parentId: 'section:philosophy-and-religion'
            },
            {
                key: 'digital',
                nameZh: '数字与跨学科人文',
                nameEn: 'Digital and interdisciplinary humanities',
                description: '数字人文、计算语言学、认知艺术与科技人文交叉方向。',
                sources: ['Digital_humanities', 'Medical_humanities', 'Digital_art', 'New_media_art', 'Music_technology', 'Interactive_art'],
                limit: 12,
                cross: true
            }
        ]
    },
    {
        key: 'geography',
        section: 'Geography',
        parentId: 'section:geography',
        color: 0x06b6d4,
        categories: [
            {
                key: 'physical',
                nameZh: '自然地理',
                nameEn: 'Physical geography',
                description: '地貌、水文、海洋、气候、生态与土壤方向。',
                sources: ['Physical_geography', 'Geomorphology', 'Hydrology', 'Oceanography', 'Climatology', 'Landscape_ecology', 'Glaciology', 'Soil_geography', 'Biogeography', 'Coastal_geography'],
                limit: 32
            },
            {
                key: 'human',
                nameZh: '人文地理',
                nameEn: 'Human geography',
                description: '城市、经济、政治、文化、人口与交通地理方向。',
                sources: ['Human_geography', 'Urban_geography', 'Economic_geography', 'Political_geography', 'Cultural_geography', 'Population_geography', 'Transport_geography', 'Health_geography'],
                limit: 28
            },
            {
                key: 'spatial',
                nameZh: '空间技术与方法',
                nameEn: 'Spatial methods and GIS',
                description: '地图学、大地测量、地理信息系统、遥感与空间分析。',
                sources: ['Cartography', 'Geodesy', 'Geographic_information_systems', 'Remote_sensing', 'Spatial_analysis', 'Geostatistics', 'Surveying', 'Photogrammetry', 'Geovisualization'],
                limit: 28,
                cross: true
            }
        ]
    },
    {
        key: 'society',
        section: 'Society and social sciences',
        parentId: 'section:society-and-social-sciences',
        color: 0xfb7185,
        categories: [
            {
                key: 'social',
                nameZh: '社会科学',
                nameEn: 'Social sciences',
                description: '社会学、人类学、心理学、人口、传播、教育与性别研究。',
                sources: ['Sociology', 'Anthropology', 'Psychology', 'Demography', 'Communication_studies', 'Gender_studies', 'Education', 'Social_work'],
                limit: 32
            },
            {
                key: 'economy',
                nameZh: '经济与管理',
                nameEn: 'Economics and management',
                description: '经济学、管理学、行为经济学与公共管理方向。',
                sources: ['Economics', 'Management', 'Behavioral_economics', 'Public_administration', 'Finance', 'Marketing', 'Organizational_studies'],
                limit: 28
            },
            {
                key: 'governance',
                nameZh: '治理与法律',
                nameEn: 'Governance and law',
                description: '法学、政治学、国际关系、犯罪学与公共政策方向。',
                sources: ['Law', 'Political_science', 'International_relations', 'Criminology', 'Public_policy', 'Human_rights', 'Constitutional_law'],
                limit: 28
            },
            {
                key: 'urban',
                nameZh: '城市与计算社会科学',
                nameEn: 'Urban and computational social science',
                description: '城市规划、计算社会科学、区域科学与网络分析。',
                sources: ['Urban_planning', 'Computational_social_science', 'Regional_science', 'Urban_studies', 'Social_network_analysis', 'Complex_networks'],
                limit: 12,
                cross: true
            }
        ]
    },
    {
        key: 'science',
        section: 'Science',
        parentId: 'section:science',
        color: 0x3b82f6,
        categories: [
            {
                key: 'basic',
                nameZh: '基础科学与交叉科学',
                nameEn: 'Basic and interdisciplinary science',
                description: '物理、化学、生物、数学、天文、生态与神经科学方向。',
                sources: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Astronomy', 'Ecology', 'Neuroscience', 'Cognitive_science', 'Systems_science', 'Environmental_science'],
                limit: 34
            },
            {
                key: 'frontiers',
                nameZh: '复杂系统与交叉前沿',
                nameEn: 'Complex systems and interdisciplinary frontiers',
                description: '复杂系统、网络科学、认知科学与科学学交叉方向。',
                sources: [],
                limit: 10,
                cross: true
            }
        ]
    }
];

const CURATED = {
    'life:clinical': ['Anatomy', 'Physiology', 'Pathology', 'Pharmacology', 'Immunology', 'Cardiology', 'Neurology', 'Oncology', 'Surgery', 'Pediatrics', 'Psychiatry', 'Endocrinology', 'Gastroenterology', 'Nephrology', 'Pulmonology', 'Rheumatology', 'Dermatology', 'Ophthalmology', 'Anesthesiology', 'Emergency_medicine', 'Geriatrics', 'Obstetrics_and_gynaecology', 'Dentistry', 'Nursing', 'Radiology', 'Radiation_therapy', 'Physical_medicine_and_rehabilitation', 'Sports_medicine', 'Palliative_care', 'Clinical_psychology', 'Medical_genetics', 'Hematology', 'Urology', 'Otorhinolaryngology'],
    'life:public': ['Public_health', 'Epidemiology', 'Global_health', 'Health_informatics', 'Health_economics', 'Health_policy', 'Environmental_health', 'Occupational_safety_and_health', 'Nutrition', 'Dietetics', 'Mental_health', 'Health_education', 'Health_promotion', 'Preventive_medicine', 'Biostatistics', 'One_Health', 'Health_care', 'Health_system', 'Maternal_health', 'Child_health', 'Vaccination', 'Health_equity', 'Community_health', 'Health_services'],
    'life:medtech': ['Medical_imaging', 'Magnetic_resonance_imaging', 'Computed_tomography', 'Medical_ultrasound', 'Positron_emission_tomography', 'Radiation_therapy', 'Prosthesis', 'Artificial_organ', 'Tissue_engineering', 'Medical_device', 'Telemedicine', 'Biomedical_engineering', 'Rehabilitation_engineering', 'Wearable_technology', 'Surgical_robot', 'Nanomedicine', 'Drug_delivery', 'Medical_robotics', 'Neuroprosthetics', 'Health_technology', 'Medical_physics', 'Clinical_engineering'],
    'tech:engineering': ['Mechanical_engineering', 'Electrical_engineering', 'Civil_engineering', 'Chemical_engineering', 'Aerospace_engineering', 'Materials_science', 'Industrial_engineering', 'Environmental_engineering', 'Marine_engineering', 'Nuclear_engineering', 'Petroleum_engineering', 'Mining_engineering', 'Agricultural_engineering', 'Systems_engineering', 'Reliability_engineering', 'Safety_engineering', 'Geotechnical_engineering', 'Structural_engineering', 'Transportation_engineering', 'Power_engineering', 'Control_engineering', 'Manufacturing_engineering'],
    'tech:intelligent': ['Artificial_intelligence', 'Machine_learning', 'Deep_learning', 'Computer_vision', 'Natural_language_processing', 'Robotics', 'Data_science', 'Big_data', 'Cybersecurity', 'Software_engineering', 'Computer_engineering', 'Quantum_computing', 'Telecommunications', 'Internet_of_things', 'Cloud_computing', 'Edge_computing', 'Information_theory', 'Control_theory', 'Pattern_recognition', 'Computer_network', 'Information_security'],
    'tech:materials': ['Nanotechnology', 'Photonics', 'Semiconductor', 'Superconductivity', 'Metallurgy', 'Polymer_science', 'Materials_science', 'Energy_storage', 'Solar_energy', 'Wind_power', 'Nuclear_technology', 'Hydrogen_technology', 'Additive_manufacturing', 'Smart_material', 'Biomaterial', 'Composite_material', 'Ceramic', 'Graphene', 'Lithium-ion_battery', 'Renewable_energy'],
    'humanities:artforms': ['Visual_arts', 'Painting', 'Sculpture', 'Photography', 'Architecture', 'Music', 'Music_theory', 'Theatre', 'Dance', 'Film', 'Film_studies', 'Performance_art', 'Digital_art', 'Installation_art', 'Printmaking', 'Ceramic_art', 'Textile_arts', 'Graphic_design', 'Industrial_design', 'Fashion_design', 'Animation', 'Opera', 'Ballet'],
    'humanities:disciplines': ['Philosophy', 'Ethics', 'Aesthetics', 'Logic', 'Epistemology', 'Metaphysics', 'Political_philosophy', 'Philosophy_of_science', 'Literature', 'Literary_criticism', 'Poetry', 'Linguistics', 'Semiotics', 'History', 'Art_history', 'Religious_studies', 'Cultural_studies', 'Classics', 'Comparative_literature', 'Rhetoric', 'Hermeneutics', 'Philosophy_of_language'],
    'humanities:digital': ['Digital_humanities', 'Computational_linguistics', 'Cognitive_science', 'Neuroaesthetics', 'Music_technology', 'Digital_art', 'Medical_humanities', 'Science_and_technology_studies'],
    'geography:physical': ['Physical_geography', 'Geomorphology', 'Hydrology', 'Oceanography', 'Climatology', 'Meteorology', 'Biogeography', 'Landscape_ecology', 'Glaciology', 'Soil_science', 'Environmental_geography', 'Coastal_geography', 'Limnology', 'Pedology', 'Hydrogeology', 'Geochemistry', 'Geophysics', 'Volcanology', 'Seismology', 'Paleoclimatology'],
    'geography:human': ['Human_geography', 'Urban_geography', 'Economic_geography', 'Political_geography', 'Cultural_geography', 'Population_geography', 'Transport_geography', 'Health_geography', 'Social_geography', 'Historical_geography', 'Development_geography', 'Geopolitics', 'Regional_geography', 'Time_geography', 'Tourism_geography', 'Language_geography', 'Military_geography', 'Strategic_geography'],
    'geography:spatial': ['Cartography', 'Geodesy', 'Geographic_information_system', 'Remote_sensing', 'Spatial_analysis', 'Geostatistics', 'Surveying', 'Photogrammetry', 'Geovisualization', 'Global_Positioning_System', 'Map_projection', 'Geoinformatics', 'Digital_elevation_model', 'Lidar', 'Satellite_navigation', 'Spatial_statistics', 'Geographic_data', 'Web_mapping'],
    'society:social': ['Sociology', 'Anthropology', 'Psychology', 'Social_psychology', 'Cognitive_psychology', 'Demography', 'Communication_studies', 'Gender_studies', 'Education', 'Social_work', 'Human_ecology', 'Cultural_anthropology', 'Political_anthropology', 'Developmental_psychology', 'Clinical_psychology', 'Sociology_of_education', 'Urban_sociology', 'Medical_sociology', 'Ethnography', 'Social_theory'],
    'society:economy': ['Economics', 'Microeconomics', 'Macroeconomics', 'Management', 'Behavioral_economics', 'Public_administration', 'Finance', 'Marketing', 'Organizational_studies', 'Operations_management', 'Human_resource_management', 'Entrepreneurship', 'International_economics', 'Development_economics', 'Environmental_economics', 'Econometrics', 'Labour_economics', 'Industrial_organization', 'Financial_economics', 'Managerial_economics'],
    'society:governance': ['Law', 'Constitutional_law', 'International_law', 'Political_science', 'International_relations', 'Public_policy', 'Human_rights', 'Criminology', 'Penology', 'Governance', 'Diplomacy', 'Security_studies', 'Comparative_politics', 'Political_economy', 'Public_law', 'Administrative_law', 'Civil_law', 'Criminal_law', 'Jurisprudence', 'Public_administration'],
    'society:urban': ['Urban_planning', 'Computational_social_science', 'Regional_science', 'Urban_studies', 'Social_network_analysis', 'Complex_network', 'Digital_economy', 'Smart_city'],
    'science:basic': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Astronomy', 'Ecology', 'Neuroscience', 'Genetics', 'Molecular_biology', 'Cell_biology', 'Evolutionary_biology', 'Microbiology', 'Biochemistry', 'Biophysics', 'Statistics', 'Probability', 'Applied_mathematics', 'Earth_science', 'Environmental_science', 'Systems_biology', 'Quantum_mechanics', 'Theory_of_relativity'],
    'science:frontiers': ['Cognitive_science', 'Network_science', 'Complex_system', 'Systems_science', 'Data_science', 'Science_and_technology_studies', 'One_Health', 'Bioinformatics', 'Biostatistics', 'Psychometrics', 'Operations_research']
};

const CROSS_NODES = [
    { resource: 'Bioinformatics', domain: 'life', category: 'frontiers', zh: '生物信息学', en: 'Bioinformatics', related: ['Biology', 'Computer', 'DNA', 'Gene', 'Protein'] },
    { resource: 'Medical_imaging', domain: 'life', category: 'frontiers', zh: '医学影像学', en: 'Medical imaging', related: ['Medicine', 'Computer', 'Cancer'] },
    { resource: 'Health_informatics', domain: 'life', category: 'frontiers', zh: '健康信息学', en: 'Health informatics', related: ['Medicine', 'Computer', 'Internet', 'Data science'] },
    { resource: 'Nanomedicine', domain: 'life', category: 'frontiers', zh: '纳米医学', en: 'Nanomedicine', related: ['Nanotechnology', 'Medicine', 'Cancer'] },
    { resource: 'Regenerative_medicine', domain: 'life', category: 'frontiers', zh: '再生医学', en: 'Regenerative medicine', related: ['Medicine', 'Stem cell', 'Biology'] },
    { resource: 'Precision_medicine', domain: 'life', category: 'frontiers', zh: '精准医学', en: 'Precision medicine', related: ['Medicine', 'Genetics', 'DNA'] },
    { resource: 'Systems_biology', domain: 'life', category: 'frontiers', zh: '系统生物学', en: 'Systems biology', related: ['Biology', 'Computer', 'Mathematics'] },
    { resource: 'Psychoneuroimmunology', domain: 'life', category: 'frontiers', zh: '心理神经免疫学', en: 'Psychoneuroimmunology', related: ['Psychology', 'Neuroscience', 'Immunology'] },
    { resource: 'Biomedical_engineering', domain: 'tech', category: 'frontiers', zh: '生物医学工程', en: 'Biomedical engineering', related: ['Engineering', 'Medicine', 'Biology'] },
    { resource: 'Cyber-physical_system', domain: 'tech', category: 'frontiers', zh: '信息物理系统', en: 'Cyber-physical system', related: ['Computer', 'Engineering', 'Internet'] },
    { resource: 'Human–computer_interaction', domain: 'tech', category: 'frontiers', zh: '人机交互', en: 'Human–computer interaction', related: ['Computer', 'Psychology', 'Robotics'] },
    { resource: 'Affective_computing', domain: 'tech', category: 'frontiers', zh: '情感计算', en: 'Affective computing', related: ['Computer', 'Psychology', 'Artificial intelligence'] },
    { resource: 'Digital_twin', domain: 'tech', category: 'frontiers', zh: '数字孪生', en: 'Digital twin', related: ['Engineering', 'Computer', 'Internet'] },
    { resource: 'Biotechnology', domain: 'tech', category: 'frontiers', zh: '生物技术', en: 'Biotechnology', related: ['Biology', 'Genetics', 'Medicine'] },
    { resource: 'Digital_humanities', domain: 'humanities', category: 'digital', zh: '数字人文', en: 'Digital humanities', related: ['Humanities', 'Computer', 'Literature', 'History'] },
    { resource: 'Computational_linguistics', domain: 'humanities', category: 'digital', zh: '计算语言学', en: 'Computational linguistics', related: ['Linguistics', 'Computer', 'Artificial intelligence'] },
    { resource: 'Cognitive_science', domain: 'humanities', category: 'digital', zh: '认知科学', en: 'Cognitive science', related: ['Psychology', 'Neuroscience', 'Philosophy', 'Artificial intelligence', 'Linguistics'] },
    { resource: 'Neuroaesthetics', domain: 'humanities', category: 'digital', zh: '神经美学', en: 'Neuroaesthetics', related: ['Neuroscience', 'Aesthetics', 'Psychology'] },
    { resource: 'Music_technology', domain: 'humanities', category: 'digital', zh: '音乐技术', en: 'Music technology', related: ['Music', 'Engineering', 'Computer'] },
    { resource: 'Digital_art', domain: 'humanities', category: 'digital', zh: '数字艺术', en: 'Digital art', related: ['Art', 'Computer', 'Digital humanities'] },
    { resource: 'Medical_humanities', domain: 'humanities', category: 'digital', zh: '医学人文', en: 'Medical humanities', related: ['Medicine', 'Humanities', 'Ethics'] },
    { resource: 'Science_and_technology_studies', domain: 'humanities', category: 'digital', zh: '科学技术论', en: 'Science and technology studies', related: ['Science', 'Technology', 'Sociology', 'History'] },
    { resource: 'Geoinformatics', domain: 'geography', category: 'spatial', zh: '地理信息学', en: 'Geoinformatics', related: ['Geography', 'Computer', 'Cartography'] },
    { resource: 'Remote_sensing', domain: 'geography', category: 'spatial', zh: '遥感', en: 'Remote sensing', related: ['Geography', 'Satellite', 'Computer'] },
    { resource: 'Urban_informatics', domain: 'geography', category: 'spatial', zh: '城市信息学', en: 'Urban informatics', related: ['Urban planning', 'Computer', 'Geography'] },
    { resource: 'Health_geography', domain: 'geography', category: 'human', zh: '健康地理学', en: 'Health geography', related: ['Geography', 'Public health', 'Medicine'] },
    { resource: 'Political_ecology', domain: 'geography', category: 'human', zh: '政治生态学', en: 'Political ecology', related: ['Geography', 'Political science', 'Ecology'] },
    { resource: 'Space_syntax', domain: 'geography', category: 'spatial', zh: '空间句法', en: 'Space syntax', related: ['Architecture', 'Urban planning', 'Geography'] },
    { resource: 'Computational_social_science', domain: 'society', category: 'urban', zh: '计算社会科学', en: 'Computational social science', related: ['Sociology', 'Computer', 'Statistics', 'Data science'] },
    { resource: 'Digital_economy', domain: 'society', category: 'urban', zh: '数字经济', en: 'Digital economy', related: ['Economics', 'Internet', 'Computer'] },
    { resource: 'Social_network_analysis', domain: 'society', category: 'urban', zh: '社会网络分析', en: 'Social network analysis', related: ['Sociology', 'Mathematics', 'Computer'] },
    { resource: 'Environmental_economics', domain: 'society', category: 'urban', zh: '环境经济学', en: 'Environmental economics', related: ['Economics', 'Climate change', 'Ecology'] },
    { resource: 'Ecological_economics', domain: 'society', category: 'urban', zh: '生态经济学', en: 'Ecological economics', related: ['Economics', 'Ecology', 'Sustainability'] },
    { resource: 'Climate_finance', domain: 'society', category: 'urban', zh: '气候金融', en: 'Climate finance', related: ['Economics', 'Climate change', 'Finance'] },
    { resource: 'Network_science', domain: 'science', category: 'frontiers', zh: '网络科学', en: 'Network science', related: ['Mathematics', 'Computer', 'Sociology', 'Biology'] },
    { resource: 'Complex_system', domain: 'science', category: 'frontiers', zh: '复杂系统', en: 'Complex system', related: ['Physics', 'Biology', 'Economics', 'Computer'] },
    { resource: 'Systems_science', domain: 'science', category: 'frontiers', zh: '系统科学', en: 'Systems science', related: ['Engineering', 'Biology', 'Sociology'] },
    { resource: 'One_Health', domain: 'science', category: 'frontiers', zh: '同一健康', en: 'One Health', related: ['Medicine', 'Veterinary medicine', 'Ecology', 'Public health'] },
    { resource: 'Data_science', domain: 'science', category: 'frontiers', zh: '数据科学', en: 'Data science', related: ['Computer', 'Mathematics', 'Statistics'] }
];

function simplify(value) {
    return Array.from(String(value || '')).map(char => traditional[char] || char).join('');
}

function normalize(value) {
    return simplify(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function normalizeEn(value) {
    return String(value || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/g, '');
}

function cleanText(value, max = 600) {
    return String(value || '').replace(/\s+/g, ' ').replace(/^["'“”]+|["'“”]+$/g, '').trim().slice(0, max);
}

function hasHan(value) {
    return /[\u4e00-\u9fff]/.test(value);
}

function hasLatin(value) {
    return /[A-Za-z]/.test(value);
}

function isBoilerplate(text) {
    return /may refer to|can refer to|topics referred|disambiguation|消歧义|维基媒体消歧义|列表|年表|索引|分类/i.test(text);
}

function loadExisting() {
    const source = fs.readFileSync(path.join(DIRECTORY, 'worldKnowledge.js'), 'utf8');
    const json = source.slice(source.indexOf('=') + 1).trim().replace(/;$/, '');
    const store = JSON.parse(json);
    const namesEn = new Set();
    const namesZh = new Set();
    const lookup = new Map();
    for (const node of store.nodes || []) {
        if (node.kind === 'category') {
            if (node.name) namesEn.add(normalizeEn(node.name));
            if (node.name) namesZh.add(normalize(node.name));
            continue;
        }
        if (node.nameEn) {
            namesEn.add(normalizeEn(node.nameEn));
            lookup.set(normalizeEn(node.nameEn), node.qid || node.id);
        }
        if (node.nameZh) {
            namesZh.add(normalize(node.nameZh));
            lookup.set(normalize(node.nameZh), node.qid || node.id);
        }
        if (node.name) {
            namesZh.add(normalize(node.name));
            lookup.set(normalize(node.name), node.qid || node.id);
        }
        (node.aliases || []).forEach(alias => {
            if (hasHan(alias)) {
                namesZh.add(normalize(alias));
                lookup.set(normalize(alias), node.qid || node.id);
            } else {
                namesEn.add(normalizeEn(alias));
                lookup.set(normalizeEn(alias), node.qid || node.id);
            }
        });
    }
    return { store, namesEn, namesZh, lookup };
}

async function sparql(query) {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/sparql-results+json',
                    'User-Agent': USER_AGENT
                },
                body: new URLSearchParams({ query, format: 'json' }),
                signal: AbortSignal.timeout(90000)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.results?.bindings || [];
        } catch (error) {
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
        }
    }
    throw lastError;
}

function buildMemberQuery(sources) {
    const values = sources.map(source => `dbc:${source}`).join(' ');
    return `SELECT ?s ?zh ?en ?zhDesc ?enDesc WHERE {
        VALUES ?cat { ${values} }
        ?s dct:subject ?cat .
        ?s rdfs:label ?zh . FILTER(lang(?zh) = "zh")
        ?s rdfs:label ?en . FILTER(lang(?en) = "en")
        OPTIONAL { ?s dbo:description ?zhDesc . FILTER(lang(?zhDesc) = "zh") }
        OPTIONAL { ?s dbo:description ?enDesc . FILTER(lang(?enDesc) = "en") }
        FILTER NOT EXISTS {
            ?s a ?bad .
            FILTER(?bad IN (dbo:Person, dbo:Place, dbo:Organisation, dbo:Work, dbo:Software, dbo:Device, dbo:Event, dbo:Album, dbo:Film, dbo:Book, dbo:Journal, dbo:Company, dbo:Species, dbo:Taxon, dbo:Settlement, dbo:Building))
        }
    } LIMIT ${PAGE_SIZE}`;
}

function buildResourceQuery(resources) {
    const values = resources.map(resource => `dbr:${resource}`).join(', ');
    return `SELECT ?s ?zh ?en ?zhDesc ?enDesc WHERE {
        ?s rdfs:label ?zh . FILTER(lang(?zh) = "zh")
        ?s rdfs:label ?en . FILTER(lang(?en) = "en")
        OPTIONAL { ?s dbo:description ?zhDesc . FILTER(lang(?zhDesc) = "zh") }
        OPTIONAL { ?s dbo:description ?enDesc . FILTER(lang(?enDesc) = "en") }
        FILTER(?s IN (${values}))
    }`;
}

function collectRows(rows) {
    const resources = new Map();
    for (const row of rows) {
        const uri = row.s?.value || '';
        if (!uri.includes('/resource/')) continue;
        const resource = decodeURIComponent(uri.split('/resource/')[1]);
        if (!resources.has(uri)) {
            resources.set(uri, { resource, zh: [], en: [], zhDesc: [], enDesc: [] });
        }
        const item = resources.get(uri);
        if (row.zh?.value) item.zh.push(row.zh.value);
        if (row.en?.value) item.en.push(row.en.value);
        if (row.zhDesc?.value) item.zhDesc.push(row.zhDesc.value);
        if (row.enDesc?.value) item.enDesc.push(row.enDesc.value);
    }
    return [...resources.values()];
}

function chooseLabel(values, language) {
    const cleaned = values.map(value => cleanText(value, 80)).filter(value => value && !isBoilerplate(value));
    const filtered = cleaned.filter(value => language === 'zh' ? hasHan(value) : hasLatin(value));
    filtered.sort((left, right) => {
        const leftPenalty = /\(|（/.test(left) ? 1 : 0;
        const rightPenalty = /\(|（/.test(right) ? 1 : 0;
        return leftPenalty - rightPenalty || left.length - right.length;
    });
    return filtered[0] || '';
}

function chooseDescription(values, language) {
    const cleaned = values.map(value => cleanText(value, 600)).filter(value => value && !isBoilerplate(value));
    const filtered = cleaned.filter(value => language === 'zh' ? hasHan(value) : hasLatin(value));
    filtered.sort((left, right) => right.length - left.length);
    return filtered[0] || '';
}

function toCandidate(item, fallback = {}) {
    const resource = item.resource;
    const zh = chooseLabel(item.zh, 'zh') || fallback.zh || '';
    const en = chooseLabel(item.en, 'en') || fallback.en || '';
    let zhDesc = chooseDescription(item.zhDesc, 'zh');
    const enDesc = chooseDescription(item.enDesc, 'en');
    if (zhDesc.length < 4) zhDesc = '';
    if (!zh || !en || !hasHan(zh) || !hasLatin(en)) return null;
    if (!zhDesc && !enDesc) return null;
    if (zh.length > 40 || en.length > 90) return null;
    if (/^(List|Outline|Index|Timeline|Bibliography|Glossary)\b/i.test(en)) return null;
    if (NAME_STOP.test(en) || OCCUPATION_STOP.test(en) || EVENT_STOP.test(en)) return null;
    if (/disambiguation|列表|消歧义|年表|索引/i.test(`${zh} ${en}`)) return null;
    if (/^\d+$/.test(en)) return null;
    const score = (zhDesc ? 5 : 0) + (enDesc ? 2 : 0)
        + Math.min(3, (zhDesc.length + enDesc.length) / 120)
        + (zh.length <= 14 ? 1 : 0) + (en.length <= 48 ? 1 : 0);
    return {
        worldId: `dbp:${resource}`,
        resource,
        nameZh: simplify(zh),
        nameEn: en,
        name: `${simplify(zh)} ${en}`,
        descriptionZh: simplify(zhDesc),
        descriptionEn: enDesc,
        sourceUrl: `https://dbpedia.org/page/${resource}`,
        wikiUrl: `https://en.wikipedia.org/wiki/${resource}`,
        score
    };
}

function unique(candidates, used, limit) {
    const selected = [];
    for (const candidate of candidates.sort((left, right) => right.score - left.score)) {
        const enKey = normalizeEn(candidate.nameEn);
        const zhKey = normalize(candidate.nameZh);
        if (used.uri.has(candidate.worldId) || used.en.has(enKey) || used.zh.has(zhKey)) continue;
        used.uri.add(candidate.worldId);
        used.en.add(enKey);
        used.zh.add(zhKey);
        selected.push(candidate);
        if (selected.length >= limit) break;
    }
    return selected;
}

function resourceIri(resource) {
    return `<http://dbpedia.org/resource/${encodeURI(resource)}>`;
}

async function fetchWikidataQids(resources) {
    const qids = new Map();
    for (let index = 0; index < resources.length; index += 50) {
        const chunk = resources.slice(index, index + 50);
        const query = `SELECT ?s ?qid WHERE {
            VALUES ?s { ${chunk.map(resourceIri).join(' ')} }
            ?s owl:sameAs ?qid .
            FILTER(STRSTARTS(STR(?qid), "http://www.wikidata.org/entity/Q"))
        }`;
        try {
            const rows = await sparql(query);
            for (const row of rows) {
                const uri = row.s?.value || '';
                if (!uri.includes('/resource/')) continue;
                const resource = decodeURIComponent(uri.split('/resource/')[1]);
                if (!qids.has(resource)) qids.set(resource, row.qid.value.split('/').pop());
            }
        } catch (error) {
            console.error(`wikidata qid batch ${index / 50 + 1}: query failed`, error.message);
        }
    }
    return qids;
}

function articleUrl(language, title) {
    return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(title).replace(/ /g, '_'))}`;
}

async function loadArticle(language, title) {
    try {
        const page = await source.fetchWikipediaPage(language, title);
        const sections = source.parseSections(page.source, { maxSections: 40, maxParagraphsPerSection: 12 });
        const chunks = source.chunkParagraphs(sections, { maxChars: 900, overlapChars: 120, minChars: 100 }).slice(0, ARTICLE_LIMIT);
        if (!chunks.length) return null;
        const cleanTitle = String(page.title || title).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        return {
            language,
            title: cleanTitle,
            url: articleUrl(language, cleanTitle),
            revision: page.latest?.id || null,
            timestamp: page.latest?.timestamp || '',
            license: page.license?.title || 'CC BY-SA 4.0',
            chunks
        };
    } catch (error) {
        if (error.statusCode !== 404) {
            console.error(`article ${language}:${title} failed`, error.message);
        }
        return null;
    }
}

const ARTICLE_CACHE = path.join(os.tmpdir(), 'pzm-world-expansion-articles.json');
const ARTICLE_CACHE_VERSION = 'world-expansion-articles-v1';
const ARTICLE_CONCURRENCY = 4;
const REFRESH_ARTICLES = process.argv.includes('--refresh-articles');

function loadArticleCache() {
    if (REFRESH_ARTICLES) return {};
    try {
        const cached = JSON.parse(fs.readFileSync(ARTICLE_CACHE, 'utf8'));
        if (cached?.schemaVersion !== ARTICLE_CACHE_VERSION || !cached.entries) return {};
        return cached.entries;
    } catch (error) {
        return {};
    }
}

function saveArticleCache(entries) {
    try {
        fs.writeFileSync(ARTICLE_CACHE, JSON.stringify({ schemaVersion: ARTICLE_CACHE_VERSION, builtAt: new Date().toISOString(), entries }), 'utf8');
    } catch (error) {
        console.error('article cache write failed', error.message);
    }
}

async function attachArticles(categories) {
    const nodes = categories.flatMap(category => category.nodes);
    const resources = [...new Set(nodes.map(node => node.resource).filter(Boolean))];
    const cache = loadArticleCache();
    const isValid = entry => Boolean(entry && Array.isArray(entry.chunks) && entry.chunks.length && entry.url);
    const pending = nodes.filter(node => !isValid(cache[node.resource]));
    console.log(`article cache: ${nodes.length - pending.length}/${nodes.length} hit, ${pending.length} to fetch`);

    let entities = {};
    let qidByResource = new Map();
    if (pending.length) {
        const pendingResources = [...new Set(pending.map(node => node.resource).filter(Boolean))];
        qidByResource = await fetchWikidataQids(pendingResources);
        console.log(`wikidata qids: ${qidByResource.size}/${pendingResources.length}`);
        entities = await source.fetchWikidataEntities([...qidByResource.values()]);
    }

    const documents = {};
    let withArticle = 0;
    let zhCount = 0;
    let enCount = 0;
    let paragraphCount = 0;
    let done = 0;
    let cursor = 0;

    const record = node => {
        const article = isValid(cache[node.resource]) ? cache[node.resource] : null;
        if (!article) return;
        node.article = {
            language: article.language,
            title: article.title,
            url: article.url,
            revision: article.revision,
            timestamp: article.timestamp,
            license: article.license,
            paragraphs: article.chunks.length
        };
        documents[node.worldId] = article;
        withArticle += 1;
        paragraphCount += article.chunks.length;
        if (article.language === 'zh') zhCount += 1;
        else enCount += 1;
    };

    const worker = async () => {
        while (true) {
            const index = cursor;
            cursor += 1;
            if (index >= nodes.length) return;
            const node = nodes[index];
            if (!isValid(cache[node.resource])) {
                const entity = entities[qidByResource.get(node.resource)];
                const zhTitle = entity?.sitelinks?.zhwiki?.title || node.nameZh;
                const enTitle = entity?.sitelinks?.enwiki?.title || node.nameEn;
                let article = zhTitle ? await loadArticle('zh', zhTitle) : null;
                if ((!article || article.chunks.length < 3) && enTitle) {
                    const fallback = await loadArticle('en', enTitle);
                    if (fallback && (!article || fallback.chunks.length > article.chunks.length)) article = fallback;
                }
                if (article) cache[node.resource] = article;
            }
            record(node);
            done += 1;
            if (done % 25 === 0 || done === nodes.length) {
                saveArticleCache(cache);
                console.log(`articles ${done}/${nodes.length} zh=${zhCount} en=${enCount} missing=${done - withArticle}`);
            }
        }
    };
    await Promise.all(new Array(ARTICLE_CONCURRENCY).fill(0).map(worker));

    const corpus = {
        meta: {
            schemaVersion: 'world-expansion-corpus-v1',
            builtAt: new Date().toISOString(),
            license: 'CC BY-SA 4.0',
            documentCount: withArticle,
            paragraphCount,
            languages: { zh: zhCount, en: enCount }
        },
        documents
    };
    const buffer = Buffer.from(JSON.stringify(corpus), 'utf8');
    fs.writeFileSync(CORPUS_OUTPUT, zlib.gzipSync(buffer, { level: 9 }));
    return { meta: corpus.meta, bytes: buffer.byteLength };
}

async function main() {
    const { namesEn, namesZh, lookup } = loadExisting();
    const used = { uri: new Set(), en: new Set(namesEn), zh: new Set(namesZh) };
    const categories = [];
    const stats = {};
    let total = 0;

    const crossByDomain = new Map();
    const crossCandidates = [];
    for (let index = 0; index < CROSS_NODES.length; index += 5) {
        const chunk = CROSS_NODES.slice(index, index + 5);
        try {
            const rows = await sparql(buildResourceQuery(chunk.map(node => node.resource)));
            crossCandidates.push(...collectRows(rows));
        } catch (error) {
            console.error(`cross batch ${index / 5 + 1}: query failed`, error.message);
        }
    }
    const crossLookup = new Map(crossCandidates.map(item => [item.resource, item]));    for (const config of CROSS_NODES) {
        const item = crossLookup.get(config.resource);
        if (!item) continue;
        const candidate = toCandidate(item, { zh: config.zh, en: config.en });
        if (!candidate) continue;
        candidate.nameZh = simplify(config.zh || candidate.nameZh);
        candidate.nameEn = config.en || candidate.nameEn;
        candidate.name = `${candidate.nameZh} ${candidate.nameEn}`;
        if (used.uri.has(candidate.worldId) || used.en.has(normalizeEn(candidate.nameEn)) || used.zh.has(normalize(candidate.nameZh))) continue;
        used.uri.add(candidate.worldId);
        used.en.add(normalizeEn(candidate.nameEn));
        used.zh.add(normalize(candidate.nameZh));
        if (!crossByDomain.has(config.domain)) crossByDomain.set(config.domain, new Map());
        const domainMap = crossByDomain.get(config.domain);
        if (!domainMap.has(config.category)) domainMap.set(config.category, []);
        domainMap.get(config.category).push({ ...candidate, config, cross: true });
        lookup.set(normalizeEn(candidate.nameEn), candidate.worldId);
        lookup.set(normalize(candidate.nameZh), candidate.worldId);
    }
    console.log(`cross candidates: ${[...crossByDomain.values()].reduce((sum, map) => sum + [...map.values()].reduce((inner, list) => inner + list.length, 0), 0)}`);

    const curatedMeta = new Map();
    for (const domain of DOMAINS) {
        for (const category of domain.categories) {
            for (const resource of CURATED[`${domain.key}:${category.key}`] || []) {
                if (!curatedMeta.has(resource)) curatedMeta.set(resource, { domain, category });
            }
        }
    }
    const curatedByCategory = new Map();
    const curatedResources = [...curatedMeta.keys()];
    for (let index = 0; index < curatedResources.length; index += 25) {
        const chunk = curatedResources.slice(index, index + 25);
        try {
            const rows = await sparql(buildResourceQuery(chunk));
            for (const item of collectRows(rows)) {
                const meta = curatedMeta.get(item.resource);
                if (!meta) continue;
                const candidate = toCandidate(item);
                if (!candidate) continue;
                if (used.uri.has(candidate.worldId) || used.en.has(normalizeEn(candidate.nameEn)) || used.zh.has(normalize(candidate.nameZh))) continue;
                used.uri.add(candidate.worldId);
                used.en.add(normalizeEn(candidate.nameEn));
                used.zh.add(normalize(candidate.nameZh));
                const key = `${meta.domain.key}:${meta.category.key}`;
                if (!curatedByCategory.has(key)) curatedByCategory.set(key, []);
                curatedByCategory.get(key).push({ ...candidate, curated: true });
                lookup.set(normalizeEn(candidate.nameEn), candidate.worldId);
                lookup.set(normalize(candidate.nameZh), candidate.worldId);
            }
        } catch (error) {
            console.error(`curated batch ${index / 25 + 1}: query failed`, error.message);
        }
    }
    console.log(`curated candidates: ${[...curatedByCategory.values()].reduce((sum, list) => sum + list.length, 0)}`);

    for (const domain of DOMAINS) {
        for (const category of domain.categories) {
            const curatedItems = curatedByCategory.get(`${domain.key}:${category.key}`) || [];
            const crossItems = crossByDomain.get(domain.key)?.get(category.key) || [];
            let selected = [...curatedItems, ...crossItems].slice(0, category.limit);
            const remaining = category.limit - selected.length;
            if (category.sources.length && remaining > 0) {
                try {
                    const rows = await sparql(buildMemberQuery(category.sources));
                    const candidates = collectRows(rows).map(item => toCandidate(item)).filter(Boolean);
                    const picked = unique(candidates, used, remaining);
                    selected = [...selected, ...picked];
                    console.log(`${domain.key}/${category.key}: rows=${rows.length} curated=${curatedItems.length} cross=${crossItems.length} picked=${picked.length} total=${selected.length}`);
                } catch (error) {
                    console.error(`${domain.key}/${category.key}: query failed`, error.message);
                }
            } else {
                console.log(`${domain.key}/${category.key}: curated=${curatedItems.length} cross=${crossItems.length} total=${selected.length}`);
            }
            if (!selected.length) continue;
            for (const node of selected) {
                lookup.set(normalizeEn(node.nameEn), node.worldId);
                lookup.set(normalize(node.nameZh), node.worldId);
            }
            categories.push({
                id: `exp:${domain.key}:${category.key}`,
                parentId: category.parentId || domain.parentId,
                key: category.key,
                domain: domain.key,
                section: domain.section,
                nameZh: category.nameZh,
                nameEn: category.nameEn,
                name: `${category.nameZh} ${category.nameEn}`,
                description: category.description,
                color: domain.color,
                nodes: selected.map(({ config, ...node }) => node)
            });
            total += selected.length;
            stats[domain.key] = (stats[domain.key] || 0) + selected.length;
        }
    }

    const crossLinks = [];
    const seenLinks = new Set();
    for (const domain of DOMAINS) {
        for (const category of domain.categories) {
            const list = crossByDomain.get(domain.key)?.get(category.key) || [];
            for (const node of list) {
                for (const related of node.config.related || []) {
                    const target = lookup.get(normalizeEn(related)) || lookup.get(normalize(related));
                    if (!target || target === node.worldId) continue;
                    const key = `${node.worldId}->${target}`;
                    if (seenLinks.has(key)) continue;
                    seenLinks.add(key);
                    crossLinks.push({ source: node.worldId, target, label: '跨学科关联' });
                }
            }
        }
    }

    let articleResult = null;
    if (SKIP_ARTICLES) {
        console.log('articles: skipped (--no-articles)');
    } else {
        source.setIntervalMs(Number(process.env.WG_INTERVAL_MS) || 450);
        articleResult = await attachArticles(categories);
        console.log(`articles: ${articleResult.meta.documentCount}/${total} zh=${articleResult.meta.languages.zh} en=${articleResult.meta.languages.en} paragraphs=${articleResult.meta.paragraphCount}`);
    }

    const payload = {
        meta: {
            schemaVersion: 'world-expansion-v1',
            builtAt: new Date().toISOString(),
            sources: ['DBpedia', 'Wikipedia'],
            license: 'CC BY-SA 3.0',
            nodeCount: total,
            categoryCount: categories.length,
            crossLinkCount: crossLinks.length,
            domainCounts: stats,
            corpus: articleResult ? {
                file: path.basename(CORPUS_OUTPUT),
                builtAt: articleResult.meta.builtAt,
                license: articleResult.meta.license,
                documentCount: articleResult.meta.documentCount,
                paragraphCount: articleResult.meta.paragraphCount,
                languages: articleResult.meta.languages,
                bytes: articleResult.bytes
            } : null
        },
        categories,
        crossLinks
    };
    const header = '// Generated by compileWorldExpansion.js from DBpedia. Do not hand-edit.\n';
    fs.writeFileSync(OUTPUT, `${header}window.WORLD_KNOWLEDGE_EXPANSION = ${JSON.stringify(payload)};\n`, 'utf8');
    console.log(JSON.stringify(payload.meta, null, 2));
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
