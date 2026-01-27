require('dotenv').config();
const puppeteer = require('puppeteer');
const Logger = require('../utils/Logger');

async function scrapeUnicaCourses() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    Logger.info('Acessando site da Única...');
    await page.goto('https://unicaposead.com/area/pos-graduacao/', { waitUntil: 'networkidle2' });
    
    await page.waitForTimeout(5000);
    
    // Coletar todos os links de cursos
    const courseLinks = await page.evaluate(() => {
      const links = [];
      const allLinks = document.querySelectorAll('a[href*="pos-graduacao"]');
      
      allLinks.forEach(link => {
        const href = link.href;
        const text = link.textContent?.trim();
        
        if (href && text && href.includes('/pos-graduacao/') && !href.includes('#') && text.length > 5) {
          links.push({
            url: href,
            title: text.replace(/Matricule-se.*$/i, '').trim()
          });
        }
      });
      
      return links;
    });
    
    Logger.info(`Encontrados ${courseLinks.length} links de cursos`);
    
    // Remover duplicatas
    const uniqueCourses = [];
    const seenTitles = new Set();
    
    courseLinks.forEach((course, index) => {
      const cleanTitle = course.title.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
      
      if (!seenTitles.has(cleanTitle) && cleanTitle.length > 5) {
        seenTitles.add(cleanTitle);
        uniqueCourses.push({
          id: uniqueCourses.length + 1,
          name: cleanTitle,
          description: '',
          link: course.url,
          category: 'Pós-graduação'
        });
      }
    });
    
    const courses = uniqueCourses;
    
    Logger.info(`Encontrados ${courses.length} cursos`);
    
    // Salvar dados
    const fs = require('fs').promises;
    await fs.writeFile('scraped-courses.json', JSON.stringify(courses, null, 2));
    
    console.log('Cursos encontrados:', courses);
    
  } catch (error) {
    Logger.error('Erro no scraping:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  scrapeUnicaCourses();
}

module.exports = scrapeUnicaCourses;