class Category {
  constructor({
    id,
    name,
    slug,
    description,
    url = null,
    coursesCount = 0,
    createdAt = new Date(),
  }) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.description = description;
    this.url = url;
    this.coursesCount = coursesCount;
    this.createdAt = createdAt;
  }

  static createSlug(name) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      url: this.url,
      coursesCount: this.coursesCount,
      createdAt: this.createdAt,
    };
  }
}

module.exports = Category;
