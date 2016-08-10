export default function login(req) {
  const user = {
    name: req.body.name,
    socketId: req.body.socketId,
  };
  req.session.user = user;
  return Promise.resolve(user);
}
