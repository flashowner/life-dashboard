document.querySelectorAll('.quest').forEach((quest) => {
  quest.addEventListener('click', () => {
    quest.classList.toggle('done');
    const completed = document.querySelectorAll('.quest.done').length;
    document.querySelector('.quest-progress').textContent = `${completed}/5 complete`;
  });
});

document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => {
  document.querySelector('.nav-item.active').classList.remove('active');
  item.classList.add('active');
}));
