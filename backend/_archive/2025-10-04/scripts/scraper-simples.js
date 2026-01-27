require('dotenv').config();
const puppeteer = require('puppeteer');
const Logger = require('../utils/Logger');

async function scrapeUnicaSimples() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    Logger.info('Acessando site da Faculdade Única...');
    await page.goto('https://www.faculdadeunica.com.br/pos-graduacao', { waitUntil: 'networkidle2' });
    
    await page.waitForTimeout(3000);
    
    // Coletar dados das categorias e cursos
    const data = await page.evaluate(() => {
      const categories = [];
      
      // Mapear categorias baseado nos dados já coletados
      const categoryMap = {
        'ciencias-da-saude': 'Ciências da Saúde',
        'educacao': 'Educação', 
        'empresarial-ti-e-negocios': 'Empresarial, TI e Negócios',
        'engenharias': 'Engenharias',
        'estetica': 'Estética',
        'gastronomia': 'Gastronomia',
        'juridica': 'Jurídica',
        'mba-executivo': 'MBA Executivo',
        'meio-ambiente': 'Meio Ambiente',
        'psicologia': 'Psicologia',
        'servico-social': 'Serviço Social'
      };
      
      // Coletar todos os links de cursos
      const courseLinks = document.querySelectorAll('a[href*="/pos-graduacao/"]');
      const courses = [];
      let courseId = 1;
      
      courseLinks.forEach(link => {
        const href = link.href;
        const text = link.textContent?.trim();
        
        if (href && text && text.length > 10 && !href.includes('#')) {
          // Extrair categoria do URL
          const urlParts = href.split('/pos-graduacao/');
          if (urlParts.length > 1) {
            const categorySlug = urlParts[1].split('/')[0];
            const categoryName = categoryMap[categorySlug] || 'Pós-graduação';
            
            // Extrair nome do curso do texto do link
            const courseName = text
              .replace(/ESCOLHER CURSO/gi, '')
              .replace(/MATRICULE-SE/gi, '')
              .replace(/VER MAIS/gi, '')
              .trim();
            
            if (courseName.length > 5) {
              courses.push({
                id: courseId++,
                name: courseName.toUpperCase(),
                description: '',
                link: href,
                category: categoryName
              });
            }
          }
        }
      });
      
      return courses;
    });
    
    // Remover duplicatas
    const uniqueCourses = [];
    const seenNames = new Set();
    
    data.forEach(course => {
      const cleanName = course.name.replace(/[^A-Z\s]/g, '').trim();
      if (!seenNames.has(cleanName) && cleanName.length > 5) {
        seenNames.add(cleanName);
        uniqueCourses.push({
          ...course,
          name: cleanName
        });
      }
    });
    
    Logger.info(`Total de cursos únicos coletados: ${uniqueCourses.length}`);
    
    // Agrupar por categoria para estatísticas
    const byCategory = {};
    uniqueCourses.forEach(course => {
      if (!byCategory[course.category]) {
        byCategory[course.category] = 0;
      }
      byCategory[course.category]++;
    });
    
    Logger.info('Cursos por categoria:', byCategory);
    
    // Salvar dados
    const fs = require('fs').promises;
    await fs.writeFile('cursos-categorias-final.json', JSON.stringify(uniqueCourses, null, 2));
    
    return uniqueCourses;
    
  } catch (error) {
    Logger.error('Erro no scraping:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  scrapeUnicaSimples();
}

module.exports = scrapeUnicaSimples;