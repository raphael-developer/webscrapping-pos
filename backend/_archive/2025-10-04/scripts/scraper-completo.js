require('dotenv').config();
const puppeteer = require('puppeteer');
const Logger = require('../utils/Logger');

async function scrapeAllUnicaCourses() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    Logger.info('Iniciando scraping completo da Única...');
    
    // Ir para página principal
    await page.goto('https://www.faculdadeunica.com.br/pos-graduacao', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Clicar em "Carregar mais" até não haver mais
    let clickCount = 0;
    let hasMoreButton = true;
    while (hasMoreButton && clickCount < 20) {
      try {
        const loadMoreButton = await page.$('button.cta-return-course-api, .load-more, [class*="load"], [class*="more"]');
        if (loadMoreButton) {
          await loadMoreButton.click();
          await page.waitForTimeout(3000);
          clickCount++;
          Logger.info(`Clicou em "Carregar mais" - ${clickCount}x`);
        } else {
          hasMoreButton = false;
        }
      } catch (error) {
        hasMoreButton = false;
      }
    }
    
    await page.waitForTimeout(3000);
    
    // Coletar todas as categorias
    const categories = await page.evaluate(() => {
      const categoryLinks = [];
      const links = document.querySelectorAll('a[href*="pos-graduacao"]');
      
      links.forEach(link => {
        const href = link.href;
        const text = link.textContent?.trim();
        
        // Procurar por links de categoria
        if (href.includes('/pos-graduacao/') && 
            !href.includes('/ead/pos-graduacao/') && 
            text && text.length > 3) {
          categoryLinks.push({
            name: text,
            url: href
          });
        }
      });
      
      return categoryLinks;
    });
    
    Logger.info(`Encontradas ${categories.length} categorias`);
    
    const allCourses = [];
    const seenCourses = new Set();
    
    // Navegar por cada categoria
    for (const category of categories) {
      try {
        Logger.info(`Navegando para categoria: ${category.name}`);
        await page.goto(category.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Coletar cursos da categoria
        const categoryCourses = await page.evaluate((categoryName) => {
          const courses = [];
          const courseLinks = document.querySelectorAll('a[href*="/ead/pos-graduacao/"]');
          
          courseLinks.forEach(link => {
            const href = link.href;
            const titleEl = link.querySelector('h1, h2, h3, h4, .title') || link;
            const title = titleEl.textContent?.trim();
            
            if (title && title.length > 5 && !title.includes('Matricule-se')) {
              courses.push({
                name: title.toUpperCase(),
                link: href,
                category: categoryName
              });
            }
          });
          
          return courses;
        }, category.name);
        
        // Adicionar cursos únicos
        categoryCourses.forEach(course => {
          const courseKey = course.name + course.link;
          if (!seenCourses.has(courseKey)) {
            seenCourses.add(courseKey);
            allCourses.push({
              id: allCourses.length + 1,
              name: course.name,
              description: '',
              link: course.link,
              category: course.category
            });
          }
        });
        
        Logger.info(`Categoria ${category.name}: ${categoryCourses.length} cursos`);
        
      } catch (error) {
        Logger.error(`Erro na categoria ${category.name}:`, error.message);
      }
    }
    
    // Coletar todos os cursos da página principal após carregar tudo
    const mainPageCourses = await page.evaluate(() => {
      const courses = [];
      
      // Buscar por cards de cursos
      const courseCards = document.querySelectorAll('.course-card, .card-course, [class*="course"], .item-course');
      
      courseCards.forEach((card, index) => {
        const titleEl = card.querySelector('h1, h2, h3, h4, .title, .course-title');
        const descEl = card.querySelector('.description, .desc, .course-desc, p');
        const linkEl = card.querySelector('a') || card.closest('a');
        
        if (titleEl && titleEl.textContent.trim()) {
          const title = titleEl.textContent.trim().toUpperCase();
          const description = descEl ? descEl.textContent.trim() : '';
          const link = linkEl ? linkEl.href : '';
          
          if (title.length > 5 && !title.includes('MATRICULE-SE')) {
            courses.push({
              name: title,
              description: description,
              link: link,
              category: 'Pós-graduação'
            });
          }
        }
      });
      
      // Se não encontrou cards, buscar por links
      if (courses.length === 0) {
        const allLinks = document.querySelectorAll('a[href*="/ead/pos-graduacao/"]');
        
        allLinks.forEach((link, index) => {
          const text = link.textContent?.trim();
          const href = link.href;
          
          if (text && text.length > 5 && !text.includes('Matricule-se')) {
            courses.push({
              name: text.toUpperCase(),
              description: '',
              link: href,
              category: 'Pós-graduação'
            });
          }
        });
      }
      
      return courses;
    });
    
    // Adicionar cursos da página principal
    mainPageCourses.forEach(course => {
      const courseKey = course.name + course.link;
      if (!seenCourses.has(courseKey)) {
        seenCourses.add(courseKey);
        allCourses.push({
          id: allCourses.length + 1,
          name: course.name,
          description: '',
          link: course.link,
          category: course.category
        });
      }
    });
    
    Logger.info(`Total de cursos únicos encontrados: ${allCourses.length}`);
    
    // Salvar dados
    const fs = require('fs').promises;
    await fs.writeFile('todos-cursos-unica.json', JSON.stringify(allCourses, null, 2));
    
    console.log(`\n=== TODOS OS CURSOS DA ÚNICA (${allCourses.length}) ===`);
    allCourses.forEach(course => {
      console.log(`${course.id}. ${course.name}`);
      console.log(`   Link: ${course.link}`);
      console.log(`   Categoria: ${course.category}\n`);
    });
    
    return allCourses;
    
  } catch (error) {
    Logger.error('Erro no scraping:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  scrapeAllUnicaCourses();
}

module.exports = scrapeAllUnicaCourses;