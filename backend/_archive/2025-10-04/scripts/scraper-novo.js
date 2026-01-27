require('dotenv').config();
const puppeteer = require('puppeteer');
const Logger = require('../utils/Logger');

async function scrapeNovoSite() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    Logger.info('Acessando site NOVO da Faculdade Única...');
    await page.goto('https://www.faculdadeunica.com.br/pos-graduacao', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    await page.waitForTimeout(5000);
    
    const allCourses = [];
    const seenCourses = new Set();
    
    // Encontrar todas as categorias
    const categoryButtons = await page.$$('button.button-card.mt-3');
    Logger.info(`Encontradas ${categoryButtons.length} categorias`);
    
    for (let i = 0; i < categoryButtons.length; i++) {
      try {
        // Voltar para página principal
        await page.goto('https://www.faculdadeunica.com.br/pos-graduacao', { 
          waitUntil: 'networkidle2' 
        });
        await page.waitForTimeout(3000);
        
        // Pegar botões novamente (página recarregou)
        const buttons = await page.$$('button.button-card.mt-3');
        if (buttons[i]) {
          // Clicar na categoria
          await buttons[i].click();
          await page.waitForTimeout(5000);
          
          Logger.info(`Categoria ${i + 1}: Carregando cursos...`);
          
          // Clicar em "Carregar mais" até não haver mais
          let hasMore = true;
          let clickCount = 0;
          while (hasMore && clickCount < 20) {
            try {
              const loadMoreBtn = await page.$('button.cta-return-course-api');
              if (loadMoreBtn) {
                await loadMoreBtn.click();
                await page.waitForTimeout(3000);
                clickCount++;
                Logger.info(`Carregou mais cursos - ${clickCount}x`);
              } else {
                hasMore = false;
              }
            } catch (e) {
              hasMore = false;
            }
          }
          
          // Extrair cursos da categoria
          const categoryCourses = await page.evaluate(() => {
            const courses = [];
            
            // Buscar por diferentes seletores de cursos
            const selectors = [
              '.course-item',
              '.card-course', 
              '.item-course',
              '[data-course]',
              '.course-card',
              '.card'
            ];
            
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              
              elements.forEach((element, index) => {
                const titleEl = element.querySelector('h1, h2, h3, h4, .title, .course-title, .name, .course-name');
                const descEl = element.querySelector('.description, .desc, .course-desc, .summary, p');
                const linkEl = element.querySelector('a') || element.closest('a');
                
                if (titleEl) {
                  const title = titleEl.textContent.trim();
                  const description = descEl ? descEl.textContent.trim() : '';
                  const link = linkEl ? linkEl.href : '';
                  
                  if (title && title.length > 3 && !title.includes('ESCOLHER')) {
                    courses.push({
                      name: title,
                      description: description,
                      link: link,
                      category: 'Pós-graduação'
                    });
                  }
                }
              });
              
              if (courses.length > 0) break;
            }
            
            return courses;
          });
          
          // Adicionar cursos únicos
          categoryCourses.forEach(course => {
            const courseKey = course.name + course.link;
            if (!seenCourses.has(courseKey)) {
              seenCourses.add(courseKey);
              allCourses.push({
                id: allCourses.length + 1,
                name: course.name,
                description: course.description,
                link: course.link,
                category: course.category
              });
            }
          });
          
          Logger.info(`Categoria ${i + 1}: ${categoryCourses.length} cursos encontrados`);
        }
        
      } catch (error) {
        Logger.error(`Erro na categoria ${i + 1}:`, error.message);
      }
    }
    
    Logger.info(`Total de cursos únicos: ${allCourses.length}`);
    
    // Salvar
    const fs = require('fs').promises;
    await fs.writeFile('cursos-site-novo.json', JSON.stringify(allCourses, null, 2));
    
    console.log(`\n=== CURSOS DO SITE NOVO (${allCourses.length}) ===`);
    allCourses.forEach(course => {
      console.log(`${course.id}. ${course.name}`);
      if (course.description) console.log(`   Desc: ${course.description.substring(0, 100)}...`);
      console.log(`   Link: ${course.link}\n`);
    });
    
    return allCourses;
    
  } catch (error) {
    Logger.error('Erro no scraping:', error);
  } finally {
    await browser.close();
  }
}

scrapeNovoSite();