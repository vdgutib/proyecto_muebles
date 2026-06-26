function setFilter(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

document.querySelectorAll('.gallery-card').forEach((card, i) => {
    card.style.animationDelay = `${0.4 + i * 0.1}s`;
    card.style.animation = 'fadeInUp 0.6s ease both';
});