<?php

namespace Lib\Prisma\Model;

interface IModel
{
    public function aggregate(array $operation);
    public function createMany(array $data);
    public function createManyAndReturn(array $data);
    public function create(array $data);
    public function deleteMany(array $criteria);
    public function delete(array $criteria);
    public function findFirst(array $criteria);
    public function findFirstOrThrow(array $criteria);
    public function findMany(array $criteria);
    public function findUnique(array $criteria);
    public function findUniqueOrThrow(array $criteria);
    public function groupBy(array $by);
    public function updateMany(array $data);
    public function updateManyAndReturn(array $data);
    public function update(array $data);
    public function upsert(array $data);
    public function count(array $criteria);
}
