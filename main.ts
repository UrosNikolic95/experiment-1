interface IItemInventoryData {
  produced_consumed: number;
  total_quantity: number;
  total_spent_money: number;
  selling_price: number;
}

interface IInventoryData {
  [resorce: string]: IItemInventoryData;
}

interface IEntity {
  money: number;
  resources: IInventoryData;
}

interface IBuyingData {
  [resource: string]: IItemBuyingData;
}

interface IItemBuyingData {
  total_quantity: number;
  total_cost: number;
}

const resource_number = 20;
const entities_number = 30;
const entities = initEntities(entities_number, resource_number);

function randIntV1(max: number) {
  return Math.floor(Math.random() * max);
}

function randIntV2(min: number, max: number) {
  return min + randIntV1(max - min);
}

function pickRandomItems<T>(items: T[], pick: number) {
  const not_picked = [...items];
  const picked: T[] = [];
  for (let i1 = 0; i1 < pick; i1++) {
    picked.push(...not_picked.splice(randIntV1(not_picked.length), 1));
  }
  return { picked, not_picked };
}

function getAllResources(num: number) {
  return Array.from({ length: num }, (v, i) => i);
}

function initEntities(entities_number: number, resource_number: number) {
  const entities: IEntity[] = [];
  for (let i1 = 0; i1 < entities_number; i1++) {
    const all = getAllResources(resource_number);
    const { picked: used } = pickRandomItems(all, 5);
    const { picked, not_picked } = pickRandomItems(used, 1);
    const produced = new Set(picked);

    entities.push({
      money: 10000000,
      resources: used.reduce((a, b) => {
        const sign = produced.has(b) ? +100 : -1;
        const total_quantity = randIntV2(30, 200);
        const total_spent_money = randIntV2(30, 200);
        a[b] = {
          total_quantity,
          total_spent_money,
          produced_consumed: randIntV2(5, 100) * sign,
          selling_price: 0,
        } as IItemInventoryData;
        return a;
      }, {} as IInventoryData),
    });
  }
  entities.forEach((entity) => {
    const total_quantity = Object.keys(entity.resources)
      .filter((resource) => entity.resources[resource].produced_consumed < 0)
      .reduce(
        (sum, resource) => sum + entity.resources[resource].total_quantity,
        0
      );
    const total_spent_money = Object.keys(entity.resources)
      .filter((resource) => entity.resources[resource].produced_consumed < 0)
      .reduce(
        (sum, resource) => sum + entity.resources[resource].total_spent_money,
        0
      );
    const cost = total_quantity / total_spent_money;
    const produced = Object.values(entity.resources).find(
      (data) => data.produced_consumed > 0
    );
    if (produced) produced.selling_price = cost;
    if (total_spent_money < 0) {
      throw new Error("5!");
    }
    if (total_quantity < 0) {
      throw new Error("6!");
    }
  });

  return entities;
}

function calcAffordable(money: number, buying_data: IBuyingData) {
  const resources = Object.keys(buying_data);
  return resources
    .map((resource) => {
      if (
        buying_data[resource].total_quantity != 0 &&
        buying_data[resource].total_cost != 0
      ) {
        const resource_buying_data = buying_data[resource];
        const cost_per_unit =
          resource_buying_data.total_cost / resource_buying_data.total_quantity;
        const affordable = money / cost_per_unit;
        return {
          resource,
          affordable,
        };
      }
    })
    .filter((el) => el);
}

function checkResourceRequirements(entity: IEntity) {
  return Object.keys(entity.resources)
    .filter((resource) => entity.resources[resource].produced_consumed < 0) // take in consideration only consumption (negative values)
    .every(
      (resource) =>
        entity.resources[resource].total_quantity +
          entity.resources[resource].produced_consumed >=
        0
    );
}

function calculateTotalCost(entity: IEntity) {
  // result will be negative number
  return Object.keys(entity.resources)
    .filter((resource) => entity.resources[resource].produced_consumed < 0) // take in consideration only consumption (negative values)
    .reduce((sum, resource) => {
      const cost_per_unit =
        entity.resources[resource].total_spent_money /
        entity.resources[resource].total_quantity;
      const resource_cost =
        cost_per_unit * entity.resources[resource].produced_consumed;
      return sum + resource_cost;
    }, 0);
}

function produce(entity: IEntity) {
  const total_cost = calculateTotalCost(entity);
  if (checkResourceRequirements(entity)) {
    const total_selling_price = Object.keys(entity.resources)
      .filter((resource) => entity.resources[resource].produced_consumed > 0)
      .reduce(
        (sum, resource) => sum + entity.resources[resource].selling_price,
        0
      );

    Object.keys(entity.resources).forEach((resource) => {
      const cost_per_unit =
        entity.resources[resource].total_spent_money /
        entity.resources[resource].total_quantity;
      const resource_cost =
        cost_per_unit * entity.resources[resource].produced_consumed;
      entity.resources[resource].total_quantity +=
        entity.resources[resource].produced_consumed;
      if (entity.resources[resource].produced_consumed < 0) {
        // if the resource is spent then cost is reduced and sent to produced resource
        entity.resources[resource].total_spent_money -= resource_cost;
      } else {
        entity.resources[resource].total_spent_money -=
          (total_cost * entity.resources[resource].selling_price) /
          total_selling_price;
      }
      if (entity.resources[resource].total_spent_money < 0) {
        throw new Error(
          [
            "8!",
            entity.resources[resource].selling_price,
            total_selling_price,
            total_cost,
          ].join("    ")
        );
      }
    });

    return true;
  }
  return false;
}

function calculateIterations(item: IItemInventoryData) {
  const iterations = item.total_quantity / item.produced_consumed;
  return iterations < 0 ? -iterations : Number.MAX_SAFE_INTEGER;
}

function calculateMinIterations(enties: IEntity[]) {
  return enties
    .map((el) =>
      Object.keys(el.resources)
        .map((resource) => ({
          iterations: calculateIterations(el.resources[resource]),
          resource,
        }))
        .map((el) => el.iterations)
    )
    .map((el) => Math.min(...el));
}

function calculateIterationsAll(enties: IEntity[]) {
  return enties
    .map((e) => (produce(e) ? 1 : 0) as number)
    .reduce((a, b) => a + b, 0);
}

function produceAll(enties: IEntity[]) {
  return enties
    .map((e) => (produce(e) ? 1 : 0) as number)
    .reduce((a, b) => a + b, 0);
}

const min = {} as { [key: string]: number };
function captureMin(category: string, val: number) {
  if (!min[category] || min[category] > val) min[category] = val;
}

const max = {} as { [key: string]: number };
function captureMax(category: string, val: number) {
  if (!max[category] || max[category] < val) max[category] = val;
}

function exchange(entities: IEntity[]) {
  entities.forEach((buyer) => {
    Object.keys(buyer.resources).forEach((resource) => {
      const rData = buyer.resources[resource];
      if (rData.produced_consumed < 0) {
        const iterations = rData.total_quantity / -rData.produced_consumed;

        if (iterations < 0) console.log("1!");
        if (iterations < 3) {
          const sellers = entities
            .filter((el) => el.resources[resource])
            .filter((el) => el.resources[resource].selling_price > 0)
            .sort(
              (a, b) =>
                a.resources[resource].selling_price -
                b.resources[resource].selling_price
            );
          const quantity = -buyer.resources[resource].produced_consumed;
          for (const seller of sellers) {
            const { selling_price, total_quantity, total_spent_money } =
              seller.resources[resource];
            const selling_cost = selling_price * quantity;
            const production_cost_per_item = total_spent_money / total_quantity;
            const production_cost = Math.min(
              production_cost_per_item * quantity,
              total_spent_money
            );

            if (production_cost < 0) {
              console.log("4!", total_spent_money, total_quantity, quantity);
              throw new Error();
            }

            if (
              buyer.money >= selling_cost &&
              seller.resources[resource].total_quantity >= quantity
            ) {
              seller.money += selling_cost;
              buyer.money -= selling_cost;
              const quantity = -buyer.resources[resource].produced_consumed;
              buyer.resources[resource].total_quantity += quantity;
              buyer.resources[resource].total_spent_money += selling_cost;
              seller.resources[resource].total_quantity -= quantity;
              seller.resources[resource].total_spent_money -= production_cost;

              captureMin("production_cost", production_cost);
              captureMax("production_cost", production_cost);
              captureMin("money", seller.money);
              captureMax("money", buyer.money);

              if (buyer.resources[resource].total_spent_money < -0.00001) {
                console.log(seller.resources[resource]);
                throw new Error("7!");
              }
              if (seller.resources[resource].total_spent_money < -0.0001) {
                console.log(seller.resources[resource]);
                throw new Error("8!");
              }
            }
          }
        }
      }
    });
  });
}

function numberWithRequirementsV1() {
  return entities
    .map((entity) => Number(checkResourceRequirements(entity) ? 1 : 0))
    .reduce((a, b) => a + b, 0);
}

function numberWithRequirementsV2() {
  return entities
    .map((entity) => Number(entity.money >= calculateTotalCost(entity) ? 1 : 0))
    .reduce((a, b) => a + b, 0);
}

function printStats() {
  console.log(
    "conditions: ",
    numberWithRequirementsV1(),
    numberWithRequirementsV2()
  );
}

function detectError1(entities: IEntity[]) {
  return entities
    .map((el) => {
      return Number(
        Object.keys(el.resources).some((resource) => {
          const rData = el.resources[resource];
          return rData.total_spent_money > Math.pow(10, 10);
        })
          ? 1
          : 0
      );
    })
    .reduce((a, b) => a + b, 0);
}

async function main() {
  let a1 = -1;
  let a2 = -1;
  let a3 = -1;
  let a4 = -1;
  for (let i = 0; i < 3000; i++) {
    produceAll(entities);
    exchange(entities);
    if (numberWithRequirementsV1() == 0 && a1 == -1) a1 = i;
    if (numberWithRequirementsV2() == 0 && a2 == -1) a2 = i;
    if (entities.some((el) => el.money < 0) && a3 == -1) a3 = i;
    if (detectError1(entities) && a4 == -1) a4 = i;
  }
  console.log("a1", a1, "a2", a2, "a3", a3, "a4", a4, detectError1(entities));
  printStats();
  console.log({ min, max });
}

main();
