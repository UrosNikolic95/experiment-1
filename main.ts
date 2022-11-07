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

function forEachOne(resource_number: number) {
  const all = getAllResources(resource_number);
  const entities: IEntity[] = [];
  for (const resource of all) {
    const { picked: used } = pickRandomItems(all, 7);
    if (!used.includes(resource)) used.push(resource);

    entities.push({
      money: 20000,
      resources: used.reduce((a, res) => {
        const sign = resource == res ? +100 : -1;
        const total_quantity = randIntV2(30, 200);
        const total_spent_money = randIntV2(30, 200);
        a[res] = {
          total_quantity,
          total_spent_money,
          produced_consumed: randIntV2(5, 100) * sign,
          selling_price: 0,
        } as IItemInventoryData;
        return a;
      }, {} as IInventoryData),
    });
  }
  return entities;
}

function initEntities(entities_number: number, resource_number: number) {
  const entities: IEntity[] = [...forEachOne(resource_number)];
  const length = entities_number - entities.length;
  for (let i1 = 0; i1 < length; i1++) {
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
        entity.resources[resource].total_quantity >=
        -entity.resources[resource].produced_consumed
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

let first = false;

function produce(entity: IEntity) {
  captureMin("money", entity.money);
  captureMax("money", entity.money);
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
      if (
        entity.resources[resource].produced_consumed < 0 &&
        entity.resources[resource].total_quantity +
          entity.resources[resource].produced_consumed >
          0
      )
        return;
      entity.resources[resource].total_quantity +=
        entity.resources[resource].produced_consumed;
      if (entity.resources[resource].produced_consumed < 0) {
        // if the resource is spent then cost is reduced and sent to produced resource
        entity.resources[resource].total_spent_money -= Math.min(
          entity.resources[resource].total_spent_money,
          Math.abs(resource_cost)
        );
      } else {
        entity.resources[resource].total_spent_money -= Math.min(
          (total_cost * entity.resources[resource].selling_price) /
            total_selling_price,
          entity.resources[resource].total_spent_money
        );
      }

      if (
        entity.resources[resource].total_spent_money ==
          Number.POSITIVE_INFINITY &&
        entity.resources[resource].produced_consumed < 0 &&
        !first
      ) {
        first = true;
        console.log({
          pc: entity.resources[resource].produced_consumed < 0,
          resource_cost,
          total_selling_price,
          cost_per_unit,
          total_spent_money: entity.resources[resource].total_spent_money,
          total_quantity: entity.resources[resource].total_quantity,
        });
      }

      if (entity.resources[resource].total_spent_money < 0) {
        throw new Error(
          [
            "8!",
            entity.resources[resource].total_spent_money,
            resource_cost,
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

function exchangeAll(entities: IEntity[]) {
  entities.forEach((buyer) => {
    Object.keys(buyer.resources).forEach((resource) => {
      const rData = buyer.resources[resource];
      if (rData.produced_consumed < 0) {
        const iterations = rData.total_quantity / -rData.produced_consumed;

        if (iterations < 3 && iterations >= 0) {
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
            const production_cost = production_cost_per_item * quantity;

            // if (production_cost == Number.POSITIVE_INFINITY)
            //   console.log({
            //     label: "????",
            //     quantity,
            //     selling_price,
            //     selling_cost,
            //     production_cost_per_item,
            //     total_spent_money,
            //     total_quantity,
            //     production_cost,
            //   });

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

              captureMax("selling_cost", selling_cost);
              captureMax("production_cost", production_cost);

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

function sumMoney() {
  return entities.map((el) => el.money).reduce((a, b) => a + b, 0);
}

async function main() {
  let a1a = -1;
  let a1b = -1;
  let a2 = -1;
  let a3 = -1;
  let a4 = -1;

  console.log("begin money", sumMoney());

  for (let i = 0; i < 5000; i++) {
    produceAll(entities);
    exchangeAll(entities);
    if (numberWithRequirementsV1() == 0 && a1a == -1) a1a = i;
    if (numberWithRequirementsV1() != 0) a1b = i;
    if (numberWithRequirementsV2() == 0 && a2 == -1) a2 = i;
    if (entities.some((el) => el.money < 0) && a3 == -1) a3 = i;
    if (detectError1(entities) && a4 == -1) a4 = i;
  }

  console.log("end money", sumMoney());

  console.log(
    "a1a",
    a1a,
    "a1b",
    a1b,
    "a2",
    a2,
    "a3",
    a3,
    "a4",
    a4,
    detectError1(entities)
  );
  printStats();
  console.log({ min, max });
}

main();
