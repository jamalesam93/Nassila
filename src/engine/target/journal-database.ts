import type { CslItem } from '../types'

export interface JournalEntry {
  name: string
  abbreviation?: string
  styleId: string
  issn?: string
  publisher?: string
  field?: string
}

export const JOURNAL_DATABASE: JournalEntry[] = [
  // ── Nature Publishing Group ──────────────────────────────────────────
  { name: 'Nature', abbreviation: 'Nature', styleId: 'nature', issn: '0028-0836', publisher: 'Springer Nature', field: 'Multidisciplinary' },
  { name: 'Nature Medicine', abbreviation: 'Nat. Med.', styleId: 'nature', issn: '1078-8956', publisher: 'Springer Nature', field: 'Medicine' },
  { name: 'Nature Genetics', abbreviation: 'Nat. Genet.', styleId: 'nature', issn: '1061-4036', publisher: 'Springer Nature', field: 'Genetics' },
  { name: 'Nature Neuroscience', abbreviation: 'Nat. Neurosci.', styleId: 'nature', issn: '1097-6256', publisher: 'Springer Nature', field: 'Neuroscience' },
  { name: 'Nature Biotechnology', abbreviation: 'Nat. Biotechnol.', styleId: 'nature', issn: '1087-0156', publisher: 'Springer Nature', field: 'Biotechnology' },
  { name: 'Nature Cell Biology', abbreviation: 'Nat. Cell Biol.', styleId: 'nature', issn: '1465-7392', publisher: 'Springer Nature', field: 'Cell Biology' },
  { name: 'Nature Chemical Biology', abbreviation: 'Nat. Chem. Biol.', styleId: 'nature', issn: '1552-4450', publisher: 'Springer Nature', field: 'Chemical Biology' },
  { name: 'Nature Communications', abbreviation: 'Nat. Commun.', styleId: 'nature', issn: '2041-1723', publisher: 'Springer Nature', field: 'Multidisciplinary' },
  { name: 'Nature Reviews Drug Discovery', abbreviation: 'Nat. Rev. Drug Discov.', styleId: 'nature', issn: '1474-1776', publisher: 'Springer Nature', field: 'Pharmacology' },
  { name: 'Nature Reviews Neuroscience', abbreviation: 'Nat. Rev. Neurosci.', styleId: 'nature', issn: '1471-003X', publisher: 'Springer Nature', field: 'Neuroscience' },
  { name: 'Nature Reviews Cancer', abbreviation: 'Nat. Rev. Cancer', styleId: 'nature', issn: '1474-175X', publisher: 'Springer Nature', field: 'Oncology' },
  { name: 'Nature Reviews Immunology', abbreviation: 'Nat. Rev. Immunol.', styleId: 'nature', issn: '1474-1733', publisher: 'Springer Nature', field: 'Immunology' },
  { name: 'Scientific Reports', abbreviation: 'Sci. Rep.', styleId: 'nature', issn: '2045-2322', publisher: 'Springer Nature', field: 'Multidisciplinary' },

  // ── Science / AAAS ───────────────────────────────────────────────────
  { name: 'Science', abbreviation: 'Science', styleId: 'science', issn: '0036-8075', publisher: 'AAAS', field: 'Multidisciplinary' },
  { name: 'Science Advances', abbreviation: 'Sci. Adv.', styleId: 'science', issn: '2375-2548', publisher: 'AAAS', field: 'Multidisciplinary' },
  { name: 'Science Translational Medicine', abbreviation: 'Sci. Transl. Med.', styleId: 'science', issn: '1946-6234', publisher: 'AAAS', field: 'Medicine' },
  { name: 'Science Signaling', abbreviation: 'Sci. Signal.', styleId: 'science', issn: '1945-0877', publisher: 'AAAS', field: 'Cell Biology' },

  // ── Cell Press ───────────────────────────────────────────────────────
  { name: 'Cell', abbreviation: 'Cell', styleId: 'cell', issn: '0092-8674', publisher: 'Elsevier', field: 'Biology' },
  { name: 'Cell Reports', abbreviation: 'Cell Rep.', styleId: 'cell', issn: '2211-1247', publisher: 'Elsevier', field: 'Biology' },
  { name: 'Cell Stem Cell', abbreviation: 'Cell Stem Cell', styleId: 'cell', issn: '1934-5909', publisher: 'Elsevier', field: 'Stem Cells' },
  { name: 'Molecular Cell', abbreviation: 'Mol. Cell', styleId: 'cell', issn: '1097-2765', publisher: 'Elsevier', field: 'Molecular Biology' },
  { name: 'Neuron', abbreviation: 'Neuron', styleId: 'cell', issn: '0896-6273', publisher: 'Elsevier', field: 'Neuroscience' },
  { name: 'Immunity', abbreviation: 'Immunity', styleId: 'cell', issn: '1074-7613', publisher: 'Elsevier', field: 'Immunology' },
  { name: 'Current Biology', abbreviation: 'Curr. Biol.', styleId: 'cell', issn: '0960-9822', publisher: 'Elsevier', field: 'Biology' },

  // ── The Lancet Group ─────────────────────────────────────────────────
  { name: 'The Lancet', abbreviation: 'Lancet', styleId: 'vancouver', issn: '0140-6736', publisher: 'Elsevier', field: 'Medicine' },
  { name: 'The Lancet Oncology', abbreviation: 'Lancet Oncol.', styleId: 'vancouver', issn: '1470-2045', publisher: 'Elsevier', field: 'Oncology' },
  { name: 'The Lancet Infectious Diseases', abbreviation: 'Lancet Infect. Dis.', styleId: 'vancouver', issn: '1473-3099', publisher: 'Elsevier', field: 'Infectious Disease' },
  { name: 'The Lancet Neurology', abbreviation: 'Lancet Neurol.', styleId: 'vancouver', issn: '1474-4422', publisher: 'Elsevier', field: 'Neurology' },
  { name: 'The Lancet Psychiatry', abbreviation: 'Lancet Psychiatry', styleId: 'vancouver', issn: '2215-0366', publisher: 'Elsevier', field: 'Psychiatry' },
  { name: 'The Lancet Public Health', abbreviation: 'Lancet Public Health', styleId: 'vancouver', issn: '2468-2667', publisher: 'Elsevier', field: 'Public Health' },
  { name: 'The Lancet Global Health', abbreviation: 'Lancet Glob. Health', styleId: 'vancouver', issn: '2214-109X', publisher: 'Elsevier', field: 'Global Health' },
  { name: 'The Lancet Respiratory Medicine', abbreviation: 'Lancet Respir. Med.', styleId: 'vancouver', issn: '2213-2600', publisher: 'Elsevier', field: 'Respiratory Medicine' },

  // ── NEJM / JAMA / BMJ (Medical) ─────────────────────────────────────
  { name: 'New England Journal of Medicine', abbreviation: 'N. Engl. J. Med.', styleId: 'vancouver', issn: '0028-4793', publisher: 'NEJM Group', field: 'Medicine' },
  { name: 'JAMA', abbreviation: 'JAMA', styleId: 'ama-11th', issn: '0098-7484', publisher: 'AMA', field: 'Medicine' },
  { name: 'JAMA Internal Medicine', abbreviation: 'JAMA Intern. Med.', styleId: 'ama-11th', issn: '2168-6106', publisher: 'AMA', field: 'Internal Medicine' },
  { name: 'JAMA Oncology', abbreviation: 'JAMA Oncol.', styleId: 'ama-11th', issn: '2374-2437', publisher: 'AMA', field: 'Oncology' },
  { name: 'JAMA Pediatrics', abbreviation: 'JAMA Pediatr.', styleId: 'ama-11th', issn: '2168-6203', publisher: 'AMA', field: 'Pediatrics' },
  { name: 'JAMA Psychiatry', abbreviation: 'JAMA Psychiatry', styleId: 'ama-11th', issn: '2168-622X', publisher: 'AMA', field: 'Psychiatry' },
  { name: 'JAMA Network Open', abbreviation: 'JAMA Netw. Open', styleId: 'ama-11th', issn: '2574-3805', publisher: 'AMA', field: 'Medicine' },
  { name: 'BMJ', abbreviation: 'BMJ', styleId: 'bmj', issn: '0959-8138', publisher: 'BMJ Publishing', field: 'Medicine' },
  { name: 'BMJ Open', abbreviation: 'BMJ Open', styleId: 'bmj', issn: '2044-6055', publisher: 'BMJ Publishing', field: 'Medicine' },
  { name: 'Annals of Internal Medicine', abbreviation: 'Ann. Intern. Med.', styleId: 'vancouver', issn: '0003-4819', publisher: 'ACP', field: 'Internal Medicine' },

  // ── PLOS ─────────────────────────────────────────────────────────────
  { name: 'PLOS ONE', abbreviation: 'PLoS ONE', styleId: 'plos', issn: '1932-6203', publisher: 'PLOS', field: 'Multidisciplinary' },
  { name: 'PLOS Medicine', abbreviation: 'PLoS Med.', styleId: 'plos', issn: '1549-1277', publisher: 'PLOS', field: 'Medicine' },
  { name: 'PLOS Biology', abbreviation: 'PLoS Biol.', styleId: 'plos', issn: '1544-9173', publisher: 'PLOS', field: 'Biology' },
  { name: 'PLOS Genetics', abbreviation: 'PLoS Genet.', styleId: 'plos', issn: '1553-7390', publisher: 'PLOS', field: 'Genetics' },
  { name: 'PLOS Computational Biology', abbreviation: 'PLoS Comput. Biol.', styleId: 'plos', issn: '1553-734X', publisher: 'PLOS', field: 'Computational Biology' },
  { name: 'PLOS Pathogens', abbreviation: 'PLoS Pathog.', styleId: 'plos', issn: '1553-7366', publisher: 'PLOS', field: 'Microbiology' },

  // ── BMC / BioMed Central ─────────────────────────────────────────────
  { name: 'BMC Medicine', abbreviation: 'BMC Med.', styleId: 'vancouver', issn: '1741-7015', publisher: 'BioMed Central', field: 'Medicine' },
  { name: 'BMC Public Health', abbreviation: 'BMC Public Health', styleId: 'vancouver', issn: '1471-2458', publisher: 'BioMed Central', field: 'Public Health' },
  { name: 'BMC Genomics', abbreviation: 'BMC Genomics', styleId: 'vancouver', issn: '1471-2164', publisher: 'BioMed Central', field: 'Genomics' },
  { name: 'BMC Bioinformatics', abbreviation: 'BMC Bioinformatics', styleId: 'vancouver', issn: '1471-2105', publisher: 'BioMed Central', field: 'Bioinformatics' },
  { name: 'BMC Cancer', abbreviation: 'BMC Cancer', styleId: 'vancouver', issn: '1471-2407', publisher: 'BioMed Central', field: 'Oncology' },
  { name: 'BMC Infectious Diseases', abbreviation: 'BMC Infect. Dis.', styleId: 'vancouver', issn: '1471-2334', publisher: 'BioMed Central', field: 'Infectious Disease' },

  // ── IEEE ─────────────────────────────────────────────────────────────
  { name: 'IEEE Transactions on Pattern Analysis and Machine Intelligence', abbreviation: 'IEEE Trans. Pattern Anal. Mach. Intell.', styleId: 'ieee', issn: '0162-8828', publisher: 'IEEE', field: 'Computer Science' },
  { name: 'IEEE Transactions on Information Theory', abbreviation: 'IEEE Trans. Inf. Theory', styleId: 'ieee', issn: '0018-9448', publisher: 'IEEE', field: 'Information Theory' },
  { name: 'IEEE Transactions on Signal Processing', abbreviation: 'IEEE Trans. Signal Process.', styleId: 'ieee', issn: '1053-587X', publisher: 'IEEE', field: 'Signal Processing' },
  { name: 'IEEE Transactions on Neural Networks and Learning Systems', abbreviation: 'IEEE Trans. Neural Netw. Learn. Syst.', styleId: 'ieee', issn: '2162-237X', publisher: 'IEEE', field: 'Machine Learning' },
  { name: 'IEEE Transactions on Communications', abbreviation: 'IEEE Trans. Commun.', styleId: 'ieee', issn: '0090-6778', publisher: 'IEEE', field: 'Communications' },
  { name: 'IEEE Access', abbreviation: 'IEEE Access', styleId: 'ieee', issn: '2169-3536', publisher: 'IEEE', field: 'Engineering' },
  { name: 'IEEE Journal of Selected Topics in Signal Processing', abbreviation: 'IEEE J. Sel. Top. Signal Process.', styleId: 'ieee', issn: '1932-4553', publisher: 'IEEE', field: 'Signal Processing' },
  { name: 'Proceedings of the IEEE', abbreviation: 'Proc. IEEE', styleId: 'ieee', issn: '0018-9219', publisher: 'IEEE', field: 'Engineering' },

  // ── ACM ──────────────────────────────────────────────────────────────
  { name: 'Communications of the ACM', abbreviation: 'Commun. ACM', styleId: 'acm', issn: '0001-0782', publisher: 'ACM', field: 'Computer Science' },
  { name: 'ACM Computing Surveys', abbreviation: 'ACM Comput. Surv.', styleId: 'acm', issn: '0360-0300', publisher: 'ACM', field: 'Computer Science' },
  { name: 'Journal of the ACM', abbreviation: 'J. ACM', styleId: 'acm', issn: '0004-5411', publisher: 'ACM', field: 'Computer Science' },
  { name: 'ACM Transactions on Graphics', abbreviation: 'ACM Trans. Graph.', styleId: 'acm', issn: '0730-0301', publisher: 'ACM', field: 'Computer Graphics' },

  // ── ACS (American Chemical Society) ──────────────────────────────────
  { name: 'Journal of the American Chemical Society', abbreviation: 'J. Am. Chem. Soc.', styleId: 'acs', issn: '0002-7863', publisher: 'ACS', field: 'Chemistry' },
  { name: 'ACS Nano', abbreviation: 'ACS Nano', styleId: 'acs', issn: '1936-0851', publisher: 'ACS', field: 'Nanoscience' },
  { name: 'Analytical Chemistry', abbreviation: 'Anal. Chem.', styleId: 'acs', issn: '0003-2700', publisher: 'ACS', field: 'Analytical Chemistry' },
  { name: 'Chemical Reviews', abbreviation: 'Chem. Rev.', styleId: 'acs', issn: '0009-2665', publisher: 'ACS', field: 'Chemistry' },
  { name: 'Environmental Science & Technology', abbreviation: 'Environ. Sci. Technol.', styleId: 'acs', issn: '0013-936X', publisher: 'ACS', field: 'Environmental Science' },
  { name: 'Journal of Physical Chemistry Letters', abbreviation: 'J. Phys. Chem. Lett.', styleId: 'acs', issn: '1948-7185', publisher: 'ACS', field: 'Physical Chemistry' },
  { name: 'Organic Letters', abbreviation: 'Org. Lett.', styleId: 'acs', issn: '1523-7060', publisher: 'ACS', field: 'Organic Chemistry' },

  // ── RSC (Royal Society of Chemistry) ─────────────────────────────────
  { name: 'Chemical Science', abbreviation: 'Chem. Sci.', styleId: 'rsc', issn: '2041-6520', publisher: 'RSC', field: 'Chemistry' },
  { name: 'Chemical Communications', abbreviation: 'Chem. Commun.', styleId: 'rsc', issn: '1359-7345', publisher: 'RSC', field: 'Chemistry' },
  { name: 'Journal of Materials Chemistry A', abbreviation: 'J. Mater. Chem. A', styleId: 'rsc', issn: '2050-7488', publisher: 'RSC', field: 'Materials Science' },
  { name: 'Nanoscale', abbreviation: 'Nanoscale', styleId: 'rsc', issn: '2040-3364', publisher: 'RSC', field: 'Nanoscience' },

  // ── Elsevier General ─────────────────────────────────────────────────
  { name: 'Elsevier - Default', abbreviation: '', styleId: 'elsevier-harvard', publisher: 'Elsevier', field: 'General' },

  // ── Springer ─────────────────────────────────────────────────────────
  { name: 'Springer - Default', abbreviation: '', styleId: 'springer-basic-author-date', publisher: 'Springer', field: 'General' },

  // ── Psychology / Social Sciences ─────────────────────────────────────
  { name: 'Psychological Bulletin', abbreviation: 'Psychol. Bull.', styleId: 'apa-7th', issn: '0033-2909', publisher: 'APA', field: 'Psychology' },
  { name: 'Psychological Review', abbreviation: 'Psychol. Rev.', styleId: 'apa-7th', issn: '0033-295X', publisher: 'APA', field: 'Psychology' },
  { name: 'Journal of Personality and Social Psychology', abbreviation: 'J. Pers. Soc. Psychol.', styleId: 'apa-7th', issn: '0022-3514', publisher: 'APA', field: 'Psychology' },
  { name: 'Developmental Psychology', abbreviation: 'Dev. Psychol.', styleId: 'apa-7th', issn: '0012-1649', publisher: 'APA', field: 'Psychology' },
  { name: 'Journal of Experimental Psychology: General', abbreviation: 'J. Exp. Psychol. Gen.', styleId: 'apa-7th', issn: '0096-3445', publisher: 'APA', field: 'Psychology' },
  { name: 'American Psychologist', abbreviation: 'Am. Psychol.', styleId: 'apa-7th', issn: '0003-066X', publisher: 'APA', field: 'Psychology' },

  // ── Education ────────────────────────────────────────────────────────
  { name: 'Review of Educational Research', abbreviation: 'Rev. Educ. Res.', styleId: 'apa-7th', issn: '0034-6543', publisher: 'AERA', field: 'Education' },
  { name: 'Educational Researcher', abbreviation: 'Educ. Res.', styleId: 'apa-7th', issn: '0013-189X', publisher: 'AERA', field: 'Education' },

  // ── Business / Economics ─────────────────────────────────────────────
  { name: 'Harvard Business Review', abbreviation: 'Harv. Bus. Rev.', styleId: 'chicago-author-date', publisher: 'Harvard Business Publishing', field: 'Business' },
  { name: 'Academy of Management Review', abbreviation: 'Acad. Manage. Rev.', styleId: 'apa-7th', issn: '0363-7425', publisher: 'Academy of Management', field: 'Management' },
  { name: 'American Economic Review', abbreviation: 'Am. Econ. Rev.', styleId: 'chicago-author-date', issn: '0002-8282', publisher: 'AEA', field: 'Economics' },
  { name: 'The Quarterly Journal of Economics', abbreviation: 'Q. J. Econ.', styleId: 'chicago-author-date', issn: '0033-5533', publisher: 'Oxford University Press', field: 'Economics' },
  { name: 'Econometrica', abbreviation: 'Econometrica', styleId: 'chicago-author-date', issn: '0012-9682', publisher: 'Econometric Society', field: 'Economics' },
  { name: 'Journal of Finance', abbreviation: 'J. Finance', styleId: 'chicago-author-date', issn: '0022-1082', publisher: 'Wiley', field: 'Finance' },
  { name: 'Journal of Political Economy', abbreviation: 'J. Polit. Econ.', styleId: 'chicago-author-date', issn: '0022-3808', publisher: 'University of Chicago Press', field: 'Economics' },

  // ── Public Health / Epidemiology ─────────────────────────────────────
  { name: 'American Journal of Public Health', abbreviation: 'Am. J. Public Health', styleId: 'ama-11th', issn: '0090-0036', publisher: 'APHA', field: 'Public Health' },
  { name: 'International Journal of Epidemiology', abbreviation: 'Int. J. Epidemiol.', styleId: 'vancouver', issn: '0300-5771', publisher: 'Oxford University Press', field: 'Epidemiology' },
  { name: 'Journal of Epidemiology and Community Health', abbreviation: 'J. Epidemiol. Community Health', styleId: 'vancouver', issn: '0143-005X', publisher: 'BMJ Publishing', field: 'Epidemiology' },
  { name: 'Preventive Medicine', abbreviation: 'Prev. Med.', styleId: 'vancouver', issn: '0091-7435', publisher: 'Elsevier', field: 'Preventive Medicine' },

  // ── Mental Health / Psychiatry ───────────────────────────────────────
  { name: 'American Journal of Psychiatry', abbreviation: 'Am. J. Psychiatry', styleId: 'ama-11th', issn: '0002-953X', publisher: 'APA Publishing', field: 'Psychiatry' },
  { name: 'British Journal of Psychiatry', abbreviation: 'Br. J. Psychiatry', styleId: 'vancouver', issn: '0007-1250', publisher: 'Cambridge University Press', field: 'Psychiatry' },
  { name: 'Psychological Medicine', abbreviation: 'Psychol. Med.', styleId: 'vancouver', issn: '0033-2917', publisher: 'Cambridge University Press', field: 'Psychiatry' },
  { name: 'Journal of Affective Disorders', abbreviation: 'J. Affect. Disord.', styleId: 'vancouver', issn: '0165-0327', publisher: 'Elsevier', field: 'Psychiatry' },
  { name: 'Depression and Anxiety', abbreviation: 'Depress. Anxiety', styleId: 'apa-7th', issn: '1091-4269', publisher: 'Wiley', field: 'Psychiatry' },

  // ── Nursing ──────────────────────────────────────────────────────────
  { name: 'Journal of Advanced Nursing', abbreviation: 'J. Adv. Nurs.', styleId: 'apa-7th', issn: '0309-2402', publisher: 'Wiley', field: 'Nursing' },
  { name: 'International Journal of Nursing Studies', abbreviation: 'Int. J. Nurs. Stud.', styleId: 'vancouver', issn: '0020-7489', publisher: 'Elsevier', field: 'Nursing' },
  { name: 'Nurse Education Today', abbreviation: 'Nurse Educ. Today', styleId: 'vancouver', issn: '0260-6917', publisher: 'Elsevier', field: 'Nursing' },

  // ── Pharmacology ─────────────────────────────────────────────────────
  { name: 'Clinical Pharmacology & Therapeutics', abbreviation: 'Clin. Pharmacol. Ther.', styleId: 'vancouver', issn: '0009-9236', publisher: 'Wiley', field: 'Pharmacology' },
  { name: 'British Journal of Clinical Pharmacology', abbreviation: 'Br. J. Clin. Pharmacol.', styleId: 'vancouver', issn: '0306-5251', publisher: 'Wiley', field: 'Pharmacology' },
  { name: 'Pharmacotherapy: The Journal of Human Pharmacology and Drug Therapy', abbreviation: 'Pharmacotherapy', styleId: 'ieee', issn: '0277-0008', publisher: 'Wiley', field: 'Pharmacology' },
  { name: 'Saudi Pharmaceutical Journal', abbreviation: 'Saudi Pharm. J.', styleId: 'ieee', issn: '1319-0163', publisher: 'Elsevier', field: 'Pharmacology' },
  { name: 'International Journal of Clinical Pharmacy', abbreviation: 'Int. J. Clin. Pharm.', styleId: 'ieee', issn: '2210-7706', publisher: 'Springer', field: 'Pharmacy' },
  { name: 'Journal of Pharmaceutical Policy and Practice', abbreviation: 'J. Pharm. Policy Pract.', styleId: 'ieee', issn: '2052-3211', publisher: 'BioMed Central', field: 'Pharmacy' },
  { name: 'Journal of Clinical Pharmacology', abbreviation: 'J. Clin. Pharmacol.', styleId: 'ieee', issn: '0091-2700', publisher: 'Wiley', field: 'Pharmacology' },
  { name: 'American Journal of Pharmaceutical Education', abbreviation: 'Am. J. Pharm. Educ.', styleId: 'ieee', issn: '0002-9459', publisher: 'AACP', field: 'Pharmacy Education' },
  { name: 'Integrative Pharmacy Research and Practice', abbreviation: 'Integr. Pharm. Res. Pract.', styleId: 'ieee', issn: '2230-524X', publisher: 'Dove', field: 'Pharmacy' },
  { name: 'Journal of Drug Delivery and Therapeutics', abbreviation: 'J. Drug Deliv. Ther.', styleId: 'ieee', issn: '2250-1177', publisher: 'JDPT', field: 'Pharmacy' },
  { name: 'PLoS ONE', abbreviation: 'PLoS ONE', styleId: 'ieee', issn: '1932-6203', publisher: 'PLOS', field: 'Multidisciplinary' },
  { name: 'Human Resources for Health', abbreviation: 'Hum. Resour. Health', styleId: 'ieee', issn: '1478-4491', publisher: 'BioMed Central', field: 'Health Policy' },
  { name: 'Healthcare', abbreviation: 'Healthcare', styleId: 'ieee', issn: '2227-9032', publisher: 'MDPI', field: 'Medicine' },
  { name: 'Frontiers in Medicine', abbreviation: 'Front. Med.', styleId: 'ieee', issn: '2296-858X', publisher: 'Frontiers', field: 'Medicine' },
  { name: 'Currents in Pharmacy Teaching and Learning', abbreviation: 'Curr. Pharm. Teach. Learn.', styleId: 'ieee', issn: '1877-1297', publisher: 'Elsevier', field: 'Pharmacy Education' },
  { name: 'Australasian Medical Journal', abbreviation: 'Australas. Med. J.', styleId: 'ieee', issn: '1836-1935', publisher: 'AMJ', field: 'Medicine' },
  { name: 'Quality in Higher Education', abbreviation: 'Qual. High. Educ.', styleId: 'ieee', issn: '1353-8322', publisher: 'Taylor & Francis', field: 'Education' },
  { name: 'Yemeni Journal for Medical Sciences', abbreviation: 'Yemeni J. Med. Sci.', styleId: 'ieee', publisher: 'Yemen', field: 'Medicine' },
  { name: 'Yemeni Journal of Medicine and Health Research', abbreviation: 'Yemeni J. Med. Health Res.', styleId: 'ieee', issn: '2709-0000', publisher: 'Yemen', field: 'Medicine' },
  { name: 'Journal of Pharmacy Practice and Community Medicine', abbreviation: 'J. Pharm. Pract. Community Med.', styleId: 'ieee', issn: '2455-3255', publisher: 'JPPCM', field: 'Pharmacy' },
  { name: 'SAGE Open Medicine', abbreviation: 'SAGE Open Med.', styleId: 'ieee', issn: '2050-3121', publisher: 'SAGE', field: 'Medicine' },
  { name: 'Federal Practitioner', abbreviation: 'Fed. Pract.', styleId: 'ieee', publisher: 'Frontline Medical Communications', field: 'Medicine' },
  { name: 'Revista Médica Clínica Las Condes', abbreviation: 'Rev. Med. Clin. Las Condes', styleId: 'ieee', publisher: 'Elsevier', field: 'Medicine' },
  { name: 'Medicine, Conflict and Survival', abbreviation: 'Med. Confl. Surviv.', styleId: 'ieee', issn: '1362-3699', publisher: 'Taylor & Francis', field: 'Medicine' },
  { name: 'Journal of Continuing Education in the Health Professions', abbreviation: 'J. Contin. Educ. Health Prof.', styleId: 'ieee', issn: '2833-8073', publisher: 'Wolters Kluwer', field: 'Medical Education' },
  { name: 'Pharmacy Education', abbreviation: 'Pharm. Educ.', styleId: 'ieee', publisher: 'FIP', field: 'Pharmacy Education' },
  { name: 'Journal of the American College of Clinical Pharmacy', abbreviation: 'J. Am. Coll. Clin. Pharm.', styleId: 'ieee', issn: '2574-9870', publisher: 'Wiley', field: 'Pharmacy' },
  { name: 'Cureus', abbreviation: 'Cureus', styleId: 'ieee', issn: '2168-8184', publisher: 'Springer Nature', field: 'Medicine' },
  { name: 'Advances in Medical Education and Practice', abbreviation: 'Adv. Med. Educ. Pract.', styleId: 'ieee', issn: '1179-7258', publisher: 'Dove', field: 'Medical Education' },
  { name: 'Exploratory Digital Health Technologies', abbreviation: 'Explor. Digit. Health Technol.', styleId: 'ieee', publisher: 'Dove', field: 'Digital Health' },
  { name: 'Saudi Journal of Clinical Pharmacy', abbreviation: 'Saudi J. Clin. Pharm.', styleId: 'ieee', publisher: 'Saudi Pharmaceutical Society', field: 'Pharmacy' },
  { name: 'Infection and Drug Resistance', abbreviation: 'Infect. Drug Resist.', styleId: 'ieee', issn: '1178-6973', publisher: 'Dove', field: 'Infectious Disease' },
  { name: 'Frontiers in Public Health', abbreviation: 'Front. Public Health', styleId: 'ieee', issn: '2296-2565', publisher: 'Frontiers', field: 'Public Health' },

  // ── Environmental / Earth Sciences ───────────────────────────────────
  { name: 'Nature Climate Change', abbreviation: 'Nat. Clim. Chang.', styleId: 'nature', issn: '1758-678X', publisher: 'Springer Nature', field: 'Climate Science' },
  { name: 'Global Environmental Change', abbreviation: 'Glob. Environ. Change', styleId: 'elsevier-harvard', issn: '0959-3780', publisher: 'Elsevier', field: 'Environmental Science' },
  { name: 'Environmental Research Letters', abbreviation: 'Environ. Res. Lett.', styleId: 'vancouver', issn: '1748-9326', publisher: 'IOP Publishing', field: 'Environmental Science' },

  // ── Physics ──────────────────────────────────────────────────────────
  { name: 'Physical Review Letters', abbreviation: 'Phys. Rev. Lett.', styleId: 'aps', issn: '0031-9007', publisher: 'APS', field: 'Physics' },
  { name: 'Physical Review A', abbreviation: 'Phys. Rev. A', styleId: 'aps', issn: '2469-9926', publisher: 'APS', field: 'Physics' },
  { name: 'Physical Review B', abbreviation: 'Phys. Rev. B', styleId: 'aps', issn: '2469-9950', publisher: 'APS', field: 'Physics' },
  { name: 'Physical Review D', abbreviation: 'Phys. Rev. D', styleId: 'aps', issn: '2470-0010', publisher: 'APS', field: 'Physics' },
  { name: 'Reviews of Modern Physics', abbreviation: 'Rev. Mod. Phys.', styleId: 'aps', issn: '0034-6861', publisher: 'APS', field: 'Physics' },
  { name: 'Nature Physics', abbreviation: 'Nat. Phys.', styleId: 'nature', issn: '1745-2473', publisher: 'Springer Nature', field: 'Physics' },

  // ── Law ──────────────────────────────────────────────────────────────
  { name: 'Harvard Law Review', abbreviation: 'Harv. L. Rev.', styleId: 'bluebook', issn: '0017-811X', publisher: 'Harvard Law Review Association', field: 'Law' },
  { name: 'Yale Law Journal', abbreviation: 'Yale L.J.', styleId: 'bluebook', issn: '0044-0094', publisher: 'Yale Law Journal Company', field: 'Law' },
  { name: 'Stanford Law Review', abbreviation: 'Stan. L. Rev.', styleId: 'bluebook', issn: '0038-9765', publisher: 'Stanford Law Review', field: 'Law' },

  // ── Humanities / Literature ──────────────────────────────────────────
  { name: 'PMLA', abbreviation: 'PMLA', styleId: 'mla-9th', issn: '0030-8129', publisher: 'MLA', field: 'Literature' },
  { name: 'New Literary History', abbreviation: 'New Lit. Hist.', styleId: 'mla-9th', issn: '0028-6087', publisher: 'Johns Hopkins University Press', field: 'Literature' },
  { name: 'American Historical Review', abbreviation: 'Am. Hist. Rev.', styleId: 'chicago-note', issn: '0002-8762', publisher: 'Oxford University Press', field: 'History' },
  { name: 'Journal of Modern History', abbreviation: 'J. Mod. Hist.', styleId: 'chicago-note', issn: '0022-2801', publisher: 'University of Chicago Press', field: 'History' },

  // ── International Relations / Political Science ──────────────────────
  { name: 'International Organization', abbreviation: 'Int. Organ.', styleId: 'chicago-author-date', issn: '0020-8183', publisher: 'Cambridge University Press', field: 'Political Science' },
  { name: 'American Political Science Review', abbreviation: 'Am. Polit. Sci. Rev.', styleId: 'chicago-author-date', issn: '0003-0554', publisher: 'Cambridge University Press', field: 'Political Science' },
  { name: 'World Politics', abbreviation: 'World Polit.', styleId: 'chicago-author-date', issn: '0043-8871', publisher: 'Cambridge University Press', field: 'Political Science' },

  // ── Sociology ────────────────────────────────────────────────────────
  { name: 'American Sociological Review', abbreviation: 'Am. Sociol. Rev.', styleId: 'asa', issn: '0003-1224', publisher: 'ASA', field: 'Sociology' },
  { name: 'American Journal of Sociology', abbreviation: 'Am. J. Sociol.', styleId: 'chicago-author-date', issn: '0002-9602', publisher: 'University of Chicago Press', field: 'Sociology' },

  // ── Multidisciplinary Open Access ────────────────────────────────────
  { name: 'Frontiers in Psychology', abbreviation: 'Front. Psychol.', styleId: 'apa-7th', issn: '1664-1078', publisher: 'Frontiers', field: 'Psychology' },
  { name: 'Frontiers in Immunology', abbreviation: 'Front. Immunol.', styleId: 'vancouver', issn: '1664-3224', publisher: 'Frontiers', field: 'Immunology' },
  { name: 'Frontiers in Microbiology', abbreviation: 'Front. Microbiol.', styleId: 'vancouver', issn: '1664-302X', publisher: 'Frontiers', field: 'Microbiology' },
  { name: 'International Journal of Environmental Research and Public Health', abbreviation: 'Int. J. Environ. Res. Public Health', styleId: 'vancouver', issn: '1661-7827', publisher: 'MDPI', field: 'Environmental Health' },
  { name: 'Sustainability', abbreviation: 'Sustainability', styleId: 'vancouver', issn: '2071-1050', publisher: 'MDPI', field: 'Sustainability' },
  { name: 'Nutrients', abbreviation: 'Nutrients', styleId: 'vancouver', issn: '2072-6643', publisher: 'MDPI', field: 'Nutrition' },
]

/** Strip trailing volume/issue fragments sometimes merged into container-title during import. */
function normalizeJournalLookupName(name: string): string {
  return name
    .replace(/\s*;\s*[\d.:eE].*$/, '')
    .replace(/\s+\d{4};\d.*$/, '')
    .replace(/[.;]\s*$/, '')
    .trim()
}

function normalizeJournalKey(name: string): string {
  return normalizeJournalLookupName(name).toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Pick journal name for abbreviation when container-title was misparsed as the article title. */
export function resolveJournalSourceForAbbrev(
  item: Pick<CslItem, 'title' | 'container-title' | 'publisher' | 'ISSN'>
): { name: string; issn?: string } | undefined {
  const raw = item['container-title']
  if (!raw) return undefined

  const titleKey = item.title ? normalizeJournalKey(item.title) : ''
  const containerKey = normalizeJournalKey(raw)

  if (titleKey && containerKey === titleKey && item.publisher) {
    const pubKey = normalizeJournalKey(item.publisher)
    if (pubKey && pubKey !== containerKey) {
      return { name: item.publisher, issn: item.ISSN }
    }
  }

  return { name: normalizeJournalLookupName(raw), issn: item.ISSN }
}

export function resolveJournalAbbreviation(
  journalName: string,
  issn?: string
): string | undefined {
  if (issn) {
    const byIssn = findJournalByIssn(issn)
    if (byIssn?.abbreviation) return byIssn.abbreviation
  }

  const normalized = normalizeJournalLookupName(journalName)
  if (!normalized) return undefined

  const q = normalized.toLowerCase()
  const key = normalizeJournalKey(normalized)

  const exact = JOURNAL_DATABASE.find((j) => j.name.toLowerCase() === q)
  if (exact?.abbreviation) return exact.abbreviation

  for (const entry of JOURNAL_DATABASE) {
    if (!entry.abbreviation) continue
    if (normalizeJournalKey(entry.abbreviation) === key) return entry.abbreviation
    if (normalizeJournalKey(entry.name) === key) return entry.abbreviation
  }

  const matches = JOURNAL_DATABASE.filter(
    (j) =>
      j.abbreviation &&
      (j.name.toLowerCase() === q ||
        q.includes(j.name.toLowerCase()) ||
        j.name.toLowerCase().includes(q) ||
        key.includes(normalizeJournalKey(j.name)) ||
        normalizeJournalKey(j.name).includes(key))
  )
  matches.sort((a, b) => b.name.length - a.name.length)
  return matches[0]?.abbreviation
}

export function findJournalByName(query: string): JournalEntry[] {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []

  return JOURNAL_DATABASE
    .filter(j =>
      j.name.toLowerCase().includes(q) ||
      (j.abbreviation && j.abbreviation.toLowerCase().includes(q))
    )
    .slice(0, 20)
}

export function findJournalByIssn(issn: string): JournalEntry | undefined {
  const clean = issn.replace(/[^0-9Xx]/g, '').toUpperCase()
  return JOURNAL_DATABASE.find(
    (j) => j.issn && j.issn.replace(/[^0-9X]/gi, '').toUpperCase() === clean
  )
}

export function getStyleForJournal(journalName: string): string | undefined {
  const q = journalName.toLowerCase().trim()
  const exact = JOURNAL_DATABASE.find(j => j.name.toLowerCase() === q)
  if (exact) return exact.styleId

  const partial = JOURNAL_DATABASE.find(j =>
    j.name.toLowerCase().includes(q) ||
    (j.abbreviation && j.abbreviation.toLowerCase().includes(q))
  )
  return partial?.styleId
}
