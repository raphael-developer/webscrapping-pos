const fs = require('fs').promises;
const path = require('path');

async function atualizarCategorias() {
  try {
    // Ler dados atuais
    const cursosPath = path.join(__dirname, '../../cursos-site-novo.json');
    const cursosData = await fs.readFile(cursosPath, 'utf8');
    const cursos = JSON.parse(cursosData);
    
    // Mapeamento de categorias baseado nos URLs
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
    
    // Atualizar categorias
    const cursosAtualizados = cursos.map(curso => {
      let categoria = 'Pós-graduação'; // categoria padrão
      
      // Extrair categoria do URL
      if (curso.link) {
        const urlParts = curso.link.split('/pos-graduacao/');
        if (urlParts.length > 1) {
          const categorySlug = urlParts[1].split('/')[0];
          categoria = categoryMap[categorySlug] || 'Pós-graduação';
        }
      }
      
      return {
        ...curso,
        category: categoria
      };
    });
    
    // Salvar dados atualizados
    await fs.writeFile(cursosPath, JSON.stringify(cursosAtualizados, null, 2));
    
    // Estatísticas
    const stats = {};
    cursosAtualizados.forEach(curso => {
      stats[curso.category] = (stats[curso.category] || 0) + 1;
    });
    
    console.log('Categorias atualizadas:');
    console.log(stats);
    console.log(`Total: ${cursosAtualizados.length} cursos`);
    
  } catch (error) {
    console.error('Erro ao atualizar categorias:', error);
  }
}

atualizarCategorias();