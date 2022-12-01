const playerCardTemplate = document.querySelector("[data-player-template]")
const playerCardContainer = document.querySelector("[data-player-cards-container]")
const searchInput = document.querySelector("[data-search]")

let players = []

searchInput.addEventListener("input", e => {
  const value = e.target.value.toLowerCase()
  players.forEach(player => {
    const isVisible =
      team.player.toLowerCase().includes(value) ||
      player.position.toLowerCase().includes(value)
    user.element.classList.toggle("hide", !isVisible)
  })
})

fetch("https://jsonplaceholder.typicode.com/users")
  .then(res => res.json())
  .then(data => {
    players = data.map(player => {
      const card = playerCardTemplate.content.cloneNode(true).children[0]
      const header = card.querySelector("[data-header]")
      const body = card.querySelector("[data-body]")
      header.textContent = team.player
      body.textContent = player.position
      playerCardContainer.append(card)
      return { name: team.player, position: player.position, element: card }
    })
  })