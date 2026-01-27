class Course {
  constructor({
    id,
    title,
    category,
    description,
    duration,
    modality,
    price,
    url,
    imageUrl,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.title = title;
    this.category = category;
    this.description = description;
    this.duration = duration;
    this.modality = modality;
    this.price = price;
    this.url = url;
    this.imageUrl = imageUrl;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static validate(courseData) {
    const errors = [];
    
    if (!courseData.title) errors.push('Título é obrigatório');
    if (!courseData.category) errors.push('Categoria é obrigatória');
    if (!courseData.url) errors.push('URL é obrigatória');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      category: this.category,
      description: this.description,
      duration: this.duration,
      modality: this.modality,
      price: this.price,
      url: this.url,
      imageUrl: this.imageUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Course;